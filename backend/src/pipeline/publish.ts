/**
 * Computes WPS from the staging tables and publishes it.
 *
 * Heavy work (aggregation, ranking, rank changes) happens in TEMP tables first.
 * The live tables are then replaced inside one short transaction, so readers
 * see either the old data or the new data, never a half-imported state, and a
 * failed run changes nothing.
 */
import type { Client } from 'pg';
import { COUNTRY_TEAM_SIZE, MAX_WPS_SCORE } from '../types';

/** rank_distribution older than this is deleted. The profile chart shows 180 days. */
const DISTRIBUTION_RETENTION_DAYS = 200;

export interface PublishResult {
  persons: number;
  ranked: number;
  historyRowsWritten: number;
  previousDate: string | null;
  weekAgoDate: string | null;
}

async function count(client: Client, sql: string): Promise<number> {
  const { rows } = await client.query<{ n: string }>(sql);
  return Number(rows[0].n);
}

/** Latest distribution date matching the condition, as YYYY-MM-DD or null. */
async function distributionDate(client: Client, where: string, params: unknown[]): Promise<string | null> {
  const { rows } = await client.query<{ d: string | null }>(
    `SELECT max(snapshot_date)::text AS d FROM rank_distribution WHERE scope = '*' AND ${where}`,
    params,
  );
  return rows[0].d;
}

/**
 * Global rank of every person on a past date, reconstructed from
 * wps_history (WPS on that date) + rank_distribution (people above that WPS).
 */
async function buildRanksAt(client: Client, table: string, date: string | null): Promise<void> {
  await client.query(`DROP TABLE IF EXISTS ${table}; CREATE TEMP TABLE ${table} (person_id text PRIMARY KEY, global_rank int NOT NULL)`);
  if (!date) return;
  await client.query(
    `
    INSERT INTO ${table} (person_id, global_rank)
    SELECT w.person_id, d.above + 1
    FROM (
      SELECT DISTINCT ON (person_id) person_id, wps_centi
      FROM wps_history
      WHERE valid_from <= $1::date
      ORDER BY person_id, valid_from DESC
    ) w
    JOIN (
      SELECT u.wps_centi, u.above
      FROM rank_distribution rd, unnest(rd.wps_centi, rd.above) AS u(wps_centi, above)
      WHERE rd.snapshot_date = $1::date AND rd.scope = '*'
    ) d ON d.wps_centi = w.wps_centi
    `,
    [date],
  );
}

/**
 * The ranked count only grows from day to day (people get ranked, almost nobody is
 * removed). A big drop means a truncated or malformed export: publishing it would
 * replace the live tables and write a history row for everyone it lost.
 */
const MAX_RANKED_DROP = 0.1;

export async function computeAndPublish(
  client: Client,
  exportDateIso: string,
  options: { force?: boolean } = {},
): Promise<PublishResult> {
  const day = exportDateIso.slice(0, 10);

  // 1. Compute into TEMP tables ------------------------------------------------
  await client.query(`
    DROP TABLE IF EXISTS stg_people, stg_event_n, stg_scores, stg_lb;

    CREATE TEMP TABLE stg_people AS
    SELECT p.id,
           p.name,
           lower(p.name)                 AS name_lower,
           p.country_id,
           COALESCE(c.name, p.country_id) AS country_name,
           NULLIF(c.iso2, '')            AS country_iso2,
           ct.code                       AS continent
    FROM stg_persons p
    LEFT JOIN stg_countries c ON c.id = p.country_id
    LEFT JOIN stg_continents ct ON ct.id = c.continent_id;

    -- N_e: everyone in the event's ranking (the size of the field).
    CREATE TEMP TABLE stg_event_n AS
    SELECT event_id, count(*)::int AS participants
    FROM stg_ranks
    GROUP BY event_id;
  `);

  // Formula: see WPS v2 in types/index.ts (eventScore / MAX_WPS_SCORE).
  await client.query(`
    CREATE TEMP TABLE stg_scores AS
    SELECT r.person_id,
           sum(greatest(0, w.weight * (1 - ln(r.world_rank) / ln(n.participants + 1)))) AS total,
           jsonb_object_agg(r.event_id, r.world_rank)                                    AS event_ranks
    FROM stg_ranks r
    JOIN stg_weights w USING (event_id)
    JOIN stg_event_n n USING (event_id)
    WHERE EXISTS (SELECT 1 FROM stg_people p WHERE p.id = r.person_id)
    GROUP BY r.person_id
  `);

  await client.query(
    `
    CREATE TEMP TABLE stg_lb AS
    WITH scored AS (
      SELECT s.person_id, p.name, p.country_iso2, p.country_name, p.continent,
             round((s.total / $1::float8 * 100)::numeric, 2) AS wps
      FROM stg_scores s
      JOIN stg_people p ON p.id = s.person_id
    )
    SELECT person_id, name, country_iso2, country_name, continent,
           wps::float8                                       AS wps,
           (wps * 100)::int                                  AS wps_centi,
           rank() OVER (ORDER BY wps DESC)::int              AS global_rank,
           CASE WHEN country_iso2 IS NOT NULL
                THEN rank() OVER (PARTITION BY country_iso2 ORDER BY wps DESC)::int
           END                                               AS country_rank,
           CASE WHEN continent IS NOT NULL
                THEN rank() OVER (PARTITION BY continent ORDER BY wps DESC)::int
           END                                               AS continent_rank
    FROM scored
    `,
    [MAX_WPS_SCORE],
  );
  await client.query('ANALYZE stg_people; ANALYZE stg_scores; ANALYZE stg_lb;');

  const { rows: fieldRows } = await client.query<{ event_id: string; participants: number }>(
    'SELECT event_id, participants FROM stg_event_n ORDER BY event_id',
  );
  const eventParticipants = JSON.stringify(Object.fromEntries(fieldRows.map((r) => [r.event_id, r.participants])));

  const ranked = await count(client, 'SELECT count(*) AS n FROM stg_lb');
  const persons = await count(client, 'SELECT count(*) AS n FROM stg_people');
  if (ranked === 0 || persons === 0) {
    throw new Error(`Refusing to publish an empty dataset (persons=${persons}, ranked=${ranked})`);
  }
  const { rows: prevRows } = await client.query<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'totalRanked'`,
  );
  const previousRanked = Number(prevRows[0]?.value ?? 0);
  if (!options.force && previousRanked > 0 && ranked < previousRanked * (1 - MAX_RANKED_DROP)) {
    throw new Error(
      `Refusing to publish: ${ranked} ranked people, down from ${previousRanked} (more than ${MAX_RANKED_DROP * 100}% fewer). ` +
        'The export may be truncated; use --force if the drop is real.',
    );
  }

  // Rank on the previous export and ~a week ago, for rank changes / movers.
  // Bounded windows: after downtime a "daily" change against a months-old export is meaningless.
  const previousDate = await distributionDate(
    client,
    'snapshot_date < $1::date AND snapshot_date >= $1::date - 3',
    [day],
  );
  const weekAgoDate = await distributionDate(
    client,
    'snapshot_date <= $1::date - 7 AND snapshot_date >= $1::date - 14',
    [day],
  );
  await buildRanksAt(client, 'stg_rank_1d', previousDate);
  await buildRanksAt(client, 'stg_rank_7d', weekAgoDate);

  // 2. Publish atomically ------------------------------------------------------
  let historyRowsWritten = 0;
  await client.query('BEGIN');
  try {
    // History: only people whose WPS differs from their latest stored value.
    const history = await client.query(
      `
      INSERT INTO wps_history (person_id, valid_from, wps_centi)
      SELECT l.person_id, $1::date, l.wps_centi
      FROM stg_lb l
      LEFT JOIN LATERAL (
        SELECT h.wps_centi FROM wps_history h
        WHERE h.person_id = l.person_id AND h.valid_from <= $1::date
        ORDER BY h.valid_from DESC LIMIT 1
      ) last ON true
      WHERE last.wps_centi IS DISTINCT FROM l.wps_centi
      ON CONFLICT (person_id, valid_from) DO UPDATE SET wps_centi = EXCLUDED.wps_centi
      `,
      [day],
    );

    await client.query('DELETE FROM rank_distribution WHERE snapshot_date = $1::date', [day]);
    await client.query(
      `
      INSERT INTO rank_distribution (snapshot_date, scope, wps_centi, above)
      SELECT $1::date, scope, array_agg(wps_centi ORDER BY wps_centi DESC), array_agg(above ORDER BY wps_centi DESC)
      FROM (
        SELECT scope, wps_centi,
               (sum(n) OVER (PARTITION BY scope ORDER BY wps_centi DESC) - n)::int AS above
        FROM (
          SELECT '*' AS scope, wps_centi, count(*) AS n FROM stg_lb GROUP BY wps_centi
          UNION ALL
          SELECT country_iso2, wps_centi, count(*) FROM stg_lb
          WHERE country_iso2 IS NOT NULL GROUP BY country_iso2, wps_centi
        ) g
      ) d
      GROUP BY scope
      `,
      [day],
    );

    await client.query('TRUNCATE leaderboard_entries, wps_breakdowns, countries, persons');
    await client.query(`
      INSERT INTO persons (id, name, name_lower, country_id, country_name, country_iso2)
      SELECT id, name, name_lower, country_id, country_name, country_iso2 FROM stg_people
    `);
    await client.query(
      `
      INSERT INTO leaderboard_entries
        (person_id, name, country_iso2, country_name, wps, global_rank, country_rank,
         continent, continent_rank, rank_change_1d, rank_change_7d, generated_at)
      SELECT l.person_id, l.name, l.country_iso2, l.country_name, l.wps, l.global_rank, l.country_rank,
             l.continent, l.continent_rank,
             r1.global_rank - l.global_rank,
             r7.global_rank - l.global_rank,
             $1::timestamptz
      FROM stg_lb l
      LEFT JOIN stg_rank_1d r1 ON r1.person_id = l.person_id
      LEFT JOIN stg_rank_7d r7 ON r7.person_id = l.person_id
      `,
      [exportDateIso],
    );
    await client.query(`
      INSERT INTO wps_breakdowns (person_id, event_ranks)
      SELECT person_id, event_ranks FROM stg_scores
    `);
    // Team score: the best COUNTRY_TEAM_SIZE WPS values, summed and divided by
    // COUNTRY_TEAM_SIZE, so a country with fewer ranked cubers counts the empty places as 0.
    await client.query(
      `
      INSERT INTO countries (iso2, name, ranked_count, continent, team_score, team_rank)
      SELECT iso2, name, ranked_count, continent, team_score,
             rank() OVER (ORDER BY team_score DESC)::int
      FROM (
        SELECT country_iso2 AS iso2, min(country_name) AS name, count(*)::int AS ranked_count,
               min(continent) AS continent,
               round((sum(wps) FILTER (WHERE pos <= $1::int) / $1::int)::numeric, 2)::float8 AS team_score
        FROM (
          SELECT country_iso2, country_name, continent, wps,
                 row_number() OVER (PARTITION BY country_iso2 ORDER BY wps DESC, person_id) AS pos
          FROM stg_lb WHERE country_iso2 IS NOT NULL
        ) ranked
        GROUP BY country_iso2
      ) c
      `,
      [COUNTRY_TEAM_SIZE],
    );

    await client.query(
      `
      INSERT INTO meta (key, value)
      SELECT * FROM unnest($1::text[], $2::text[])
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `,
      [
        ['generatedAt', 'totalRanked', 'wcaExportDate', 'refreshLastSuccessAt', 'eventParticipants', 'wpsFormulaVersion'],
        [exportDateIso, String(ranked), exportDateIso, new Date().toISOString(), eventParticipants, '3'],
      ],
    );

    await client.query(
      `DELETE FROM rank_distribution WHERE snapshot_date < $1::date - $2::int`,
      [day, DISTRIBUTION_RETENTION_DAYS],
    );

    await client.query('COMMIT');
    historyRowsWritten = history.rowCount ?? 0;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }

  // After COMMIT the data is live: a failed ANALYZE only means slower plans until
  // autovacuum analyzes the tables, so it must not fail the run (or skip avatars).
  try {
    await client.query(
      'ANALYZE persons; ANALYZE leaderboard_entries; ANALYZE wps_breakdowns; ANALYZE countries; ANALYZE wps_history; ANALYZE rank_distribution;',
    );
  } catch (error) {
    console.warn('[publish] ANALYZE after publish failed:', error);
  }

  return { persons, ranked, historyRowsWritten, previousDate, weekAgoDate };
}

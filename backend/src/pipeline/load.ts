/**
 * Streams WCA TSVs into TEMP staging tables with COPY.
 * Only the needed columns/rows are sent, so the DB never stores the raw export.
 */
import fs from 'fs';
import readline from 'readline';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import type { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { CONTINENTS, EVENT_WEIGHTS, rankTypeOf, type RankType } from '../types';

/** Escapes a value for COPY ... (FORMAT text); empty -> NULL. */
function copyValue(v: string | undefined): string {
  if (v === undefined || v === '' || v === '\\N') return '\\N';
  return v.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

/**
 * Reads a TSV with a header row and yields COPY lines built by `map`
 * (return null to skip a row).
 */
async function* tsvToCopyLines(
  file: string,
  map: (col: (name: string) => string | undefined) => (string | undefined)[] | null,
): AsyncGenerator<string> {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let header: Map<string, number> | null = null;
  for await (const line of rl) {
    if (!line) continue;
    const cells = line.split('\t');
    if (!header) {
      header = new Map(cells.map((name, i) => [name.trim().toLowerCase(), i]));
      continue;
    }
    const h = header;
    const row = map((name) => {
      const idx = h.get(name);
      if (idx === undefined) throw new Error(`${file}: no column "${name}"`);
      return cells[idx]?.trim();
    });
    if (row) yield row.map(copyValue).join('\t') + '\n';
  }
}

async function copyInto(client: Client, sql: string, lines: AsyncIterable<string>): Promise<void> {
  await pipeline(Readable.from(lines), client.query(copyFrom(sql)));
}

export interface StagingFiles {
  persons: string;
  countries: string;
  ranksAverage: string;
  ranksSingle: string;
}

/** COPY lines of the scored events whose ranking type is `type`. */
function rankLines(file: string, type: RankType): AsyncGenerator<string> {
  return tsvToCopyLines(file, (c) => {
    const eventId = c('event_id');
    const rank = Number(c('world_rank'));
    if (!eventId || !(eventId in EVENT_WEIGHTS) || rankTypeOf(eventId) !== type) return null;
    if (!Number.isInteger(rank) || rank < 1) return null;
    return [c('person_id'), eventId, String(rank)];
  });
}

export async function loadStaging(client: Client, files: StagingFiles): Promise<void> {
  await client.query(`
    DROP TABLE IF EXISTS stg_persons, stg_countries, stg_ranks, stg_weights, stg_continents;
    CREATE TEMP TABLE stg_countries (id text PRIMARY KEY, iso2 text, name text NOT NULL, continent_id text);
    CREATE TEMP TABLE stg_continents (id text PRIMARY KEY, code text NOT NULL);
    CREATE TEMP TABLE stg_persons   (id text PRIMARY KEY, name text NOT NULL, country_id text);
    CREATE TEMP TABLE stg_ranks     (person_id text NOT NULL, event_id text NOT NULL, world_rank int NOT NULL);
    CREATE TEMP TABLE stg_weights   (event_id text PRIMARY KEY, weight float8 NOT NULL);
  `);

  await copyInto(
    client,
    'COPY stg_countries (id, iso2, name, continent_id) FROM STDIN',
    tsvToCopyLines(files.countries, (c) => [c('id'), c('iso2'), c('name'), c('continent_id')]),
  );

  // sub_id > 1 rows are older names/countries of the same person.
  await copyInto(
    client,
    'COPY stg_persons (id, name, country_id) FROM STDIN',
    tsvToCopyLines(files.persons, (c) =>
      c('sub_id') === '1' && c('wca_id') && c('name') ? [c('wca_id'), c('name'), c('country_id')] : null,
    ),
  );

  // Each event comes from exactly one ranking (see SINGLE_RANKED_EVENTS).
  await copyInto(client, 'COPY stg_ranks (person_id, event_id, world_rank) FROM STDIN', rankLines(files.ranksAverage, 'average'));
  await copyInto(client, 'COPY stg_ranks (person_id, event_id, world_rank) FROM STDIN', rankLines(files.ranksSingle, 'single'));

  const events = Object.entries(EVENT_WEIGHTS);
  await client.query(
    `INSERT INTO stg_weights (event_id, weight) SELECT * FROM unnest($1::text[], $2::float8[])`,
    [events.map(([id]) => id), events.map(([, w]) => w)],
  );
  const continents = Object.entries(CONTINENTS);
  await client.query(
    `INSERT INTO stg_continents (id, code) SELECT * FROM unnest($1::text[], $2::text[])`,
    [continents.map(([id]) => id), continents.map(([, c]) => c.code)],
  );

  // Autovacuum never analyzes TEMP tables; without stats the planner guesses badly.
  await client.query('ANALYZE stg_countries; ANALYZE stg_persons; ANALYZE stg_ranks; ANALYZE stg_weights;');
}

/**
 * WCA profile photos for the people shown in lists.
 *
 * The results export has no photos, so they come from the public WCA API,
 * 200 people per request. Only people who appear near the top of a list are
 * fetched (about 5,000), not all 300k: the profile page asks WCA directly.
 * A failure here never fails the refresh; the previous avatars stay.
 */
import type { Client } from 'pg';

const WCA_PERSONS_URL = process.env.WCA_PERSONS_URL ?? 'https://www.worldcubeassociation.org/api/v0/persons';
const BATCH_SIZE = 200;
const DELAY_BETWEEN_REQUESTS_MS = 300;

/** How deep into each list avatars are fetched. */
const TOP_WORLD = 1000;
const TOP_CONTINENT = 100;
const TOP_COUNTRY = 25;

interface WcaPersonsItem {
  person?: { wca_id?: string; avatar?: { thumb_url?: string; is_default?: boolean } };
}

const REQUEST_TIMEOUT_MS = 60_000;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;

/** One batch, retried: the WCA API is slow and sometimes times out or returns 5xx. */
async function fetchBatchWithRetry(ids: string[]): Promise<Map<string, string>> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchBatch(ids);
    } catch (error) {
      if (attempt >= ATTEMPTS) throw error;
      console.warn(`[avatars] batch failed (attempt ${attempt}/${ATTEMPTS}), retrying:`, error);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
}

async function fetchBatch(ids: string[]): Promise<Map<string, string>> {
  const url = `${WCA_PERSONS_URL}?wca_ids=${ids.join(',')}&per_page=${ids.length}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'wps-ranking-pipeline' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`WCA persons request failed: ${res.status} ${res.statusText}`);
  const body = (await res.json()) as WcaPersonsItem[];
  const found = new Map<string, string>();
  for (const item of body) {
    const id = item.person?.wca_id;
    const avatar = item.person?.avatar;
    if (id && avatar?.thumb_url && avatar.is_default === false) found.set(id, avatar.thumb_url);
  }
  return found;
}

export async function refreshAvatars(client: Client): Promise<{ requested: number; withPhoto: number }> {
  const { rows } = await client.query<{ person_id: string }>(
    `
    SELECT person_id FROM leaderboard_entries WHERE global_rank <= $1
    UNION SELECT person_id FROM leaderboard_entries WHERE continent_rank <= $2
    UNION SELECT person_id FROM leaderboard_entries WHERE country_rank <= $3
    `,
    [TOP_WORLD, TOP_CONTINENT, TOP_COUNTRY],
  );
  const ids = rows.map((r) => r.person_id).sort();

  const avatars = new Map<string, string>();
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    if (i > 0) await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
    for (const [id, url] of await fetchBatchWithRetry(ids.slice(i, i + BATCH_SIZE))) avatars.set(id, url);
  }

  // All batches succeeded: replace the table in one transaction.
  await client.query('BEGIN');
  try {
    await client.query('TRUNCATE person_avatars');
    await client.query(
      'INSERT INTO person_avatars (person_id, thumb_url) SELECT * FROM unnest($1::text[], $2::text[])',
      [[...avatars.keys()], [...avatars.values()]],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
  return { requested: ids.length, withPhoto: avatars.size };
}

export async function avatarsMissing(client: Client): Promise<boolean> {
  const { rows } = await client.query<{ n: string }>('SELECT count(*) AS n FROM person_avatars');
  return Number(rows[0].n) === 0;
}

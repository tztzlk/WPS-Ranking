import { Client } from 'pg';

/**
 * Plain `pg` client for the pipeline (COPY + set-based SQL); the API keeps using Prisma.
 *
 * Needs a session-level connection: TEMP tables live for the whole run. On Supabase use the
 * direct connection or the *session* pooler (port 5432), not the transaction pooler (6543).
 */
export async function connect(): Promise<Client> {
  const raw = process.env.PIPELINE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('Set PIPELINE_DATABASE_URL or DATABASE_URL');
  }

  const url = new URL(raw);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  // node-postgres treats sslmode=require as verify-full, which rejects Supabase's
  // own CA. Strip it and configure TLS explicitly.
  url.searchParams.delete('sslmode');
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('connection_limit');

  const client = new Client({
    connectionString: url.toString(),
    ssl: isLocal ? false : { rejectUnauthorized: false },
    application_name: 'wps-pipeline',
  });
  await client.connect();
  await client.query('SET statement_timeout = 0');
  return client;
}

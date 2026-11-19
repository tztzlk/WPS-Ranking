# WPS Ranking

A global ranking for speedcubers using the Weighted Performance Scale (WPS): one score that rewards strong results across many WCA events, not just one.

## Architecture

```
                 daily, GitHub Actions
WCA export ──► src/pipeline ──COPY──► Supabase Postgres ◄── Express API (Vercel Function) ◄── React SPA (Vercel)
```

| Part | Where | Notes |
|------|-------|-------|
| Frontend | `frontend/`, Vercel project | Vite + React + TS |
| API | `backend/`, Vercel project | Express, zero-config Vercel Function (`src/index.ts` exports the app). Read-only. |
| Database | Supabase Postgres (free tier) | Prisma schema + migrations in `backend/prisma` |
| Data pipeline | `backend/src/pipeline`, `.github/workflows/refresh-data.yml` | Daily at 02:00 UTC. Never runs inside the API. |

### Daily pipeline

1. Ask the WCA API for the current export date; stop if it is already published.
2. Download the TSV export, extract `persons`, `countries`, `ranks_average`.
3. Stream them into TEMP staging tables with `COPY`.
4. Compute WPS, world and country ranks in SQL.
5. In **one short transaction**: replace `persons`, `leaderboard_entries`, `wps_breakdowns`, `countries`; append history; update `meta`. Readers see old or new data, never a half-import; a failed run changes nothing.

Takes ~30 s and ~120 MB RAM for ~300k persons.

### History without daily full copies

Storing a full ranking snapshot per day costs ~30 MB/day (it filled the 500 MB free tier in about two weeks). Instead:

- `wps_history` stores a row only when a person's WPS changes (a few percent of people per week).
- `rank_distribution` stores, per day and per scope (world `*` or country ISO2), the distinct WPS values and how many people were strictly above each.

Global/country rank on any past day = `above[position of that day's WPS] + 1`. This reproduces the stored ranks exactly and costs ~0.3 MB/day. The profile chart, daily rank change and weekly movers all come from these two tables.

## WPS formula

```
Event score = weight × 10 / ln(world_rank + 1)      (world rank by average)
WPS         = Σ event scores / max possible × 100   (max = every event at world rank 1)
```

Ranks use `RANK()` over WPS rounded to 0.01, so equal WPS means equal rank.

| Event | ID | Weight |
|-------|----|--------|
| 3x3 Cube | `333` | 1.0 |
| 2x2 Cube | `222` | 0.85 |
| 4x4 Cube | `444` | 0.6 |
| 5x5 Cube | `555` | 0.5 |
| 6x6 Cube | `666` | 0.35 |
| 7x7 Cube | `777` | 0.3 |
| 3x3 Blindfolded | `333bf` | 0.2 |
| 3x3 Fewest Moves | `333fm` | 0.2 |
| 3x3 One-Handed | `333oh` | 0.6 |
| Clock | `clock` | 0.45 |
| Megaminx | `minx` | 0.45 |
| Pyraminx | `pyram` | 0.75 |
| Skewb | `skewb` | 0.65 |
| Square-1 | `sq1` | 0.4 |
| 4x4 Blindfolded | `444bf` | 0.12 |
| 5x5 Blindfolded | `555bf` | 0.1 |

Weights live in `backend/src/types/index.ts` (`EVENT_WEIGHTS`) and are used by both the pipeline and the API.

## Development

```bash
# Postgres for local dev
docker run -d --name wps-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wps -p 5432:5432 postgres:17

cd backend
cp .env.example .env          # DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wps
npm ci
npx prisma migrate deploy
npm run refresh               # downloads the WCA export (~390 MB) and loads it
npm run dev                   # API on :5000

cd ../frontend && npm ci && npm run dev   # :3000, proxies /api to :5000
```

`npm run refresh -- --dir <path>` uses an already extracted export; `--force` re-publishes the same export.

### API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/leaderboard` | Global or country leaderboard (`?country=XX&limit=100`) |
| GET | `/api/countries` | Countries with ranked cubers |
| GET | `/api/profile/:wcaId` | Profile |
| GET | `/api/profile/:wcaId/history` | Last 180 days: WPS, global and country rank |
| GET | `/api/cuber/:wcaId/wps-breakdown` | Per-event contribution |
| GET | `/api/search` | `?q=` name prefix, WCA ID or ISO2 country |
| GET | `/api/compare` | `?left=...&right=...` |
| GET | `/api/about` | Formula data |
| GET | `/api/og/profile/:wcaId` | OG image (PNG 1200×630) |
| GET | `/profile/:wcaId` | OG meta HTML for crawlers, redirect for people |

## Deployment

### Database (Supabase)

Connection strings: Project → Connect.

- **Transaction pooler** (port 6543) → API on Vercel. Append `?pgbouncer=true&connection_limit=1`.
- **Session pooler** (port 5432) → pipeline and migrations (GitHub runners have no IPv6, so not the direct host).

Migrations are applied by the refresh workflow (`prisma migrate deploy`) before each run. They are idempotent, so they also apply cleanly to the database originally created with `prisma db push`; `20261119000000_history_rework` converts the old `history_snapshots` into the new history tables and drops it.

### GitHub Actions

Repository secret `PIPELINE_DATABASE_URL` = session pooler URL. Run **Refresh WCA data** once manually (Actions → Run workflow) after setting it.

### API (Vercel)

New Vercel project from this repo, **Root Directory** `backend`, framework preset Express (detected). Env:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | transaction pooler URL |
| `CORS_ORIGINS` | frontend origin, e.g. `https://wps-ranking.vercel.app` |
| `SITE_URL` | this API's URL (share/OG links) |
| `FRONTEND_URL` | frontend URL |

Check: `curl https://<api>/api/health`.

### Frontend (Vercel)

Root Directory `frontend`; `VITE_API_BASE_URL=https://<api>/api`.

## Data source

All rankings use official data from the [World Cube Association](https://www.worldcubeassociation.org/export/results). This site is not affiliated with the WCA.

## License

MIT

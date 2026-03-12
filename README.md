# WPS Ranking

A global ranking platform for speedcubers using the Weighted Performance Scale (WPS) system.

## Overview

WPS Ranking provides a fair, balanced scoring system for speedcubers worldwide. Unlike traditional rankings that favor single events, WPS promotes versatility by weighting performance across all WCA events.

## Architecture

- **Frontend:** React SPA (Vite + TypeScript), deployed on Vercel.
- **Backend:** Node.js + Express + TypeScript + Prisma, deployed on Render (or similar).
- **Database:** PostgreSQL (Supabase). All API data is served from Postgres at runtime.
- **Data pipeline (offline):** WCA TSV export files are processed into JSON indexes (`backend/cache/`), then imported into Postgres via batch scripts. The pipeline is **not** part of the HTTP server; it runs as one-off or scheduled jobs.

```
Runtime:   Frontend --> Express API --> Prisma Client --> PostgreSQL
Pipeline:  WCA TSV --> leaderboardTop100 (JSON) --> importData --> PostgreSQL
```

## WPS Formula

```
Event Score = weight * (1 / log(world_rank + 1)) * 10
WPS Score   = (sum of event scores / max possible score) * 100
```

### Event Weights

| Event | Weight |
|-------|--------|
| 3x3x3 Cube | 1.0 (baseline) |
| 2x2x2 Cube | 0.8 |
| 4x4x4 Cube | 0.9 |
| 5x5x5 Cube | 0.9 |
| 6x6x6 Cube | 0.7 |
| 7x7x7 Cube | 0.7 |
| 3x3x3 Blindfolded | 0.6 |
| 3x3x3 Fewest Moves | 0.5 |
| 3x3x3 One-Handed | 0.8 |
| Clock | 0.6 |
| Megaminx | 0.7 |
| Pyraminx | 0.7 |
| Skewb | 0.7 |
| Square-1 | 0.6 |
| 4x4x4 Blindfolded | 0.4 |
| 5x5x5 Blindfolded | 0.3 |
| 3x3x3 Multi-Blind | 0.3 |

## Development

```bash
# Backend dev (TS watch, port 5000)
cd backend && npm run dev

# Frontend dev (Vite, proxies /api to localhost:5000)
cd frontend && npm run dev

# Frontend pointing at remote API
cd frontend && VITE_API_BASE_URL=https://your-backend.example.com/api npm run dev

# Backend build + start
cd backend && npm run build && npm start
```

### Backend API routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/leaderboard` | Global or country leaderboard (`?country=XX&limit=100`) |
| GET | `/api/countries` | List of countries |
| GET | `/api/profile/:wcaId` | Profile by WCA ID |
| GET | `/api/search` | Search cubers (`?q=...&limit=20`) |
| GET | `/api/compare` | Compare two cubers (`?left=...&right=...`) |
| GET | `/api/about` | Formula and philosophy data |
| GET | `/api/og/profile/:personId` | OG image (PNG, 1200x630) |

### Data pipeline scripts (offline only)

These scripts are **never** called by the running server. Run them manually or via cron.

```bash
cd backend

# 1. Download WCA export, extract TSVs, generate JSON indexes
npm run update:data

# 2. (Re)generate leaderboard JSON from existing TSVs
npm run leaderboard:update

# 3. Import JSON indexes + Persons.tsv into PostgreSQL
npm run import:data
```

## Deployment

### Environment variables

#### Backend (required at runtime)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooler URL, e.g. Supabase port 6543 with `?pgbouncer=true`) |
| `NODE_ENV` | `production` |
| `PORT` | Server port (default `5000`; platform may provide this) |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `https://wps-ranking.vercel.app`) |

#### Backend (required at build / CLI time)

| Variable | Description |
|----------|-------------|
| `DIRECT_DATABASE_URL` | Direct PostgreSQL URL (e.g. Supabase port 5432 with `?sslmode=require`). Used by `prisma generate`, `prisma migrate`, `prisma db push`, and `import:data`. |
| `DATABASE_URL` | Also needed at build time because `postinstall` runs `prisma generate`. |

#### Backend (optional)

| Variable | Description |
|----------|-------------|
| `PUBLIC_PATH` | Path to frontend build for same-origin serving |
| `SITE_URL` | Public base URL for OG meta tags |
| `CACHE_DIR` | Override cache directory for pipeline scripts (default: `./cache`) |
| `WCA_EXPORT_URL` | Override WCA export download URL |

#### Frontend

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base (e.g. `https://your-backend.com/api`). Default: `/api` |

### Deploy backend (Render)

1. Create a new Web Service, connect repo.
2. **Root directory:** `backend`
3. **Build command:** `npm ci && npm run build`
4. **Start command:** `npm start`
5. **Node version:** 20
6. Set environment variables: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `NODE_ENV=production`, `CORS_ORIGINS`.
7. Verify: `curl https://<backend>/api/health` should return `{"ok":true,"env":"production"}`.

### Render Cron Job (data refresh)

Create a Cron Job on Render to run the data refresh pipeline daily. Use the same repo and environment variables as the Web Service.

| Setting | Value |
|--------|-------|
| **Root Directory** | `backend` |
| **Build Command** | `npm ci && npm run build` |
| **Schedule** | `0 3 * * *` (daily at 03:00 UTC) |
| **Command** | `npm run refresh:data` |

> If Root Directory is already `backend`, do **not** prepend `cd backend &&` to the command.

### Deploy frontend (Vercel)

1. Import repo, set **Root directory** to `frontend`.
2. Set `VITE_API_BASE_URL` to `https://<backend>/api`.
3. Deploy. `frontend/vercel.json` configures build and output.

### Database setup

1. Create a PostgreSQL database (e.g. Supabase).
2. Apply schema: `cd backend && npx prisma db push` (or `npx prisma migrate deploy` if migrations exist).
3. Populate data: run the pipeline (`update:data` then `import:data`).

### Go-live checklist

- [ ] Backend deployed; `GET /api/health` returns `{ ok: true, env: "production" }`.
- [ ] Database populated (run pipeline scripts).
- [ ] Frontend deployed with `VITE_API_BASE_URL` pointing to backend.
- [ ] CORS: `CORS_ORIGINS` includes frontend origin.
- [ ] Smoke test: Home, Leaderboard, Profile, Search, Compare, About all work.

## Open Graph

Profile links get rich previews in Telegram, Discord, etc. The backend intercepts crawler User-Agents at `/profile/:personId` and serves OG meta HTML. OG images are generated at `/api/og/profile/:personId` and cached in memory (max 500, 1h TTL).

For same-origin setup, set `PUBLIC_PATH` and `SITE_URL`. For split deployment, the frontend host must proxy crawler requests to the backend.

## Data Source

All rankings use official data from the [World Cube Association](https://www.worldcubeassociation.org).

## License

MIT License - see LICENSE file for details.

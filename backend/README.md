# WPS Ranking Backend

Backend API for WPS Ranking, built with Node.js, Express, TypeScript, and PostgreSQL (via Prisma).

## Features

- **PostgreSQL + Prisma**: Person search, profiles, and rankings served from indexed database queries
- **WCA API Integration**: Fetches data from the World Cube Association API
- **WPS Calculation**: Implements the Weighted Performance Scale scoring system
- **RESTful API**: Endpoints for leaderboard, profiles, search, and compare
- **Connection Pooling**: PgBouncer-compatible via Supabase pooler

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Then edit .env with your credentials
```

#### Required at runtime

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled, port 6543 for Supabase) with `?pgbouncer=true` |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

#### Required at build / CLI time

| Variable | Description |
|---|---|
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection (port 5432, `?sslmode=require`). Used by `prisma generate`, `prisma migrate`, `prisma db push`, and `import:data`. |
| `DATABASE_URL` | Also required at build time because `postinstall` runs `prisma generate` via `prisma.config.ts`. |

> **Note:** Both `DATABASE_URL` and `DIRECT_DATABASE_URL` must be available when `npm install` / `npm ci` runs, because `postinstall` executes `prisma generate` which loads `prisma.config.ts` and validates both variables. If deploying on a platform where secrets are only available at runtime, either set them as build-time env vars or remove the `postinstall` script and run `prisma generate` separately.

#### Optional

| Variable | Description |
|---|---|
| `PUBLIC_PATH` | Path to frontend build for same-origin serving |
| `SITE_URL` | Public base URL for OG meta tags (fallback: `http://localhost:PORT`) |
| `CACHE_DIR` | Override cache directory for pipeline scripts (default: `./cache`) |
| `WCA_EXPORT_URL` | Override WCA export download URL |

### 3. Apply database schema

This project uses `prisma db push` (schemaless migrations). No migrations directory is needed.

```bash
npx prisma db push
```

This synchronizes the Prisma schema with the database without creating migration files.

### 4. Import data into PostgreSQL

Ensure the cache files exist (run `npm run update:data` first if needed), then:

```bash
npm run import:data
```

This reads from:
- `cache/wca_export/Persons.tsv`
- `cache/wps.index.json`
- `cache/wpsRank.index.json`
- `cache/countries.index.json`

And upserts into `persons`, `wps_scores`, `wps_ranks`, and `meta` tables.

### 5. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

## API Endpoints

### Search
- `GET /api/search?q=query` - Search cubers by name, WCA ID, or country
- `GET /api/search?wcaId=ID` - Exact WCA ID lookup
- Query parameters: `q`, `wcaId`, `limit` (default 20, max 50)

### Profiles
- `GET /api/profile/:wcaId` - Get cuber profile by WCA ID
- `GET /api/profile?personId=ID` - Get profile by query param
- Returns: WCA ID, name, country, WPS score, global rank, country rank, last updated

### Compare
- `GET /api/compare?left=ID1&right=ID2` - Compare two cubers
- Also accepts: `id1` and `id2` as aliases

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard
- Query parameters: `limit`, `country` (ISO2)

### Other
- `GET /api/countries` - List all countries
- `GET /api/about` - WPS formula and platform information
- `GET /api/health` - Health check

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |
| `npm run db:push` | Apply Prisma schema to database (primary schema sync method) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:validate` | Validate Prisma schema |
| `npm run update:data` | Download and process WCA export into JSON indexes |
| `npm run import:data` | Import JSON indexes + Persons.tsv into PostgreSQL |
| `npm run leaderboard:update` | Regenerate leaderboard JSON from existing TSVs |
| `npm run debug:person` | Look up a person by WCA ID (debug script) |

## Tech Stack

- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** (Supabase) with **Prisma ORM**
- **pg** + `@prisma/adapter-pg` for connection pooling
- **Helmet** / **CORS** / **Compression** for security and performance

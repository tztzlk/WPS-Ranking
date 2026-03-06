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
cp env.example .env
```

Required variables in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled, port 6543 for Supabase) with `?pgbouncer=true` |
| `DIRECT_DATABASE_URL` | Direct PostgreSQL connection (port 5432) used for migrations |
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### 3. Run database migration

```bash
npx prisma migrate dev --name init_prisma
```

For production:

```bash
npx prisma migrate deploy
```

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
- Query parameters: `includeBreakdown=1` for event breakdown

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
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run migrations (dev) |
| `npm run prisma:deploy` | Run migrations (production) |
| `npm run import:data` | Import TSV/JSON data into PostgreSQL |
| `npm run update:data` | Download and process WCA export |

## Tech Stack

- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** (Supabase) with **Prisma ORM**
- **pg** + `@prisma/adapter-pg` for connection pooling
- **Helmet** / **CORS** / **Compression** for security and performance

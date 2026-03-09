# WPS Ranking Backend

Backend API for WPS Ranking: **Express → file-based JSON/TSV cache** at runtime. Offline pipeline ingests WCA TSV export and regenerates JSON indexes used by the API.

## Architecture

- **Runtime (production)**: Client → Express → services → JSON index files under `CACHE_DIR`. No PostgreSQL or Prisma at runtime.
- **Offline pipeline** (scripts only, not used by API): WCA TSV download → `updateData` / `leaderboardTop100` → JSON indexes used directly by the API.

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
| `PORT` | Server port (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated allowed origins |

#### Optional

| Variable | Description |
|---|---|
| `PUBLIC_PATH` | Path to frontend build for same-origin serving |
| `SITE_URL` | Public base URL for OG meta tags (fallback: `http://localhost:PORT`) |
| `CACHE_DIR` | Override cache directory for pipeline scripts and runtime (default: `./cache`) |
| `WCA_EXPORT_URL` | Override WCA export download URL |

### 3. Build JSON/TSV caches (offline pipeline)

The API reads from JSON index files under `CACHE_DIR`. To (re)build them from the WCA TSV export, run:

```bash
npm run update:data
```

This will download the latest WCA export, extract the TSVs, and regenerate:

- `cache/leaderboard.top100.json`
- `cache/persons.index.json`
- `cache/wps.index.json`
- `cache/wpsRank.index.json`
- `cache/countries.index.json`
- `cache/wps.breakdown.json`

You can also regenerate leaderboard/WPS JSON from existing TSVs only:

```bash
npm run leaderboard:update
```

### 4. Start the development server

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

**Runtime (server)**  
| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |

**Offline pipeline (not used by API)**  
| Script | Description |
|---|---|
| `npm run update:data` | Download WCA export, extract TSVs, build JSON indexes |
| `npm run leaderboard:update` | Regenerate leaderboard/WPS JSON from existing TSVs |
| `npm run debug:person` | Look up a person by WCA ID (debug) |

## Tech Stack

- **Runtime**: Node.js, Express, TypeScript, file-based JSON indexes (no database).
- **Pipeline**: WCA TSV → offline scripts → JSON indexes under `CACHE_DIR`.
- **Helmet** / **CORS** / **Compression** for security and performance.

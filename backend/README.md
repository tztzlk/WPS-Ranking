# WPS Ranking Backend

This is the backend API for WPS Ranking, built with Node.js, Express, and TypeScript.

## Features

- **WCA API Integration**: Fetches data from the World Cube Association API
- **WPS Calculation**: Implements the Weighted Performance Scale scoring system
- **RESTful API**: Clean endpoints for leaderboard, profiles, and search
- **Caching**: Optimized performance with intelligent caching
- **Error Handling**: Comprehensive error handling and logging

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Start the development server:
```bash
npm run dev
```

4. The API will be available at `http://localhost:5000`

## API Endpoints

### Leaderboard
- `GET /api/leaderboard` - Get global leaderboard
- Query parameters: `limit`, `offset`

### Profiles
- `GET /api/profile/:wcaId` - Get cuber profile by WCA ID

### Search
- `GET /api/search?q=query` - Search cubers by name or WCA ID
- Query parameters: `q`, `limit`

### About
- `GET /api/about` - Get WPS formula and platform information

### Health
- `GET /api/health` - API health check

## WPS Formula

The Weighted Performance Scale calculates scores using:

```
Event Score = weight × (1 / log(world_rank + 1)) × 10
WPS Score = (sum of event scores / max possible score) × 100
```

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `WCA_API_BASE_URL` - WCA API base URL
- `DATABASE_URL` - PostgreSQL connection string
- `CORS_ORIGIN` - Allowed CORS origin

## Tech Stack

- **Node.js** with Express
- **TypeScript** for type safety
- **Axios** for HTTP requests
- **CORS** for cross-origin requests
- **Helmet** for security headers
- **Dotenv** for environment configuration

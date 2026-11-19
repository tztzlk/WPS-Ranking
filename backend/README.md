# WPS Ranking backend

- `src/index.ts`: Express API (deployed as a Vercel Function, read-only)
- `src/pipeline/`: daily WCA data refresh (`npm run refresh`, runs in GitHub Actions)
- `prisma/`: schema and migrations

Setup, architecture and deployment: see the [root README](../README.md).

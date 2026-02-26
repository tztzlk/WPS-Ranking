# WPS Ranking

A global ranking platform for speedcubers using the Weighted Performance Scale (WPS) system.

## 🎯 Overview

WPS Ranking provides a fair, balanced scoring system for speedcubers worldwide. Unlike traditional rankings that favor single events, WPS promotes versatility by weighting performance across all WCA events.

## ✨ Features

- **Global Leaderboard**: Top 1000 speedcubers ranked by WPS score
- **Fair Scoring**: Balanced weighting across all WCA events
- **Search Functionality**: Find cubers by name, WCA ID, or country
- **Profile Views**: Detailed performance breakdowns
- **Real-time Updates**: Automatic integration with WCA data
- **Responsive Design**: Dark mode theme optimized for all devices

## 📊 WPS Formula

The Weighted Performance Scale calculates scores using:

```
Event Score = weight × (1 / log(world_rank + 1)) × 10
WPS Score = (sum of event scores / max possible score) × 100
```

### Event Weights
- 3x3x3 Cube: 1.0 (baseline)
- 2x2x2 Cube: 0.8
- 4x4x4 Cube: 0.9
- 5x5x5 Cube: 0.9
- 6x6x6 Cube: 0.7
- 7x7x7 Cube: 0.7
- 3x3x3 Blindfolded: 0.6
- 3x3x3 Fewest Moves: 0.5
- 3x3x3 One-Handed: 0.8
- Clock: 0.6
- Megaminx: 0.7
- Pyraminx: 0.7
- Skewb: 0.7
- Square-1: 0.6
- 4x4x4 Blindfolded: 0.4
- 5x5x5 Blindfolded: 0.3
- 3x3x3 Multi-Blind: 0.3

## 🔧 Development

See root `package.json`: `npm run dev` (backend + frontend), `npm run build` then `npm start` for production.

## 📤 Open Graph & social sharing

Profile links (e.g. `https://wps-ranking.com/profile/2017AMAN04`) get rich previews in Telegram, Discord, and other apps that use Open Graph.

### Meta tag strategy (no client-side OG)

- **Crawlers only:** The backend does **not** put OG meta in the SPA’s `index.html`. Instead, when a **crawler** (Telegram, Discord, etc.) requests `GET /profile/:personId`, the server responds with a **minimal HTML page** that contains only the OG meta tags and a link. Normal users hitting the same URL get the SPA (when the backend serves the frontend) or your existing frontend host.
- **Detection:** Crawler `User-Agent` is checked (e.g. `TelegramBot`, `Discordbot`, `facebookexternalhit`, `Twitterbot`). Only those requests receive the meta HTML.
- **Tags set:** `og:title`, `og:description`, `og:image` (1200×630), `og:url`, `og:type`, `twitter:card` / `twitter:title` / `twitter:description` / `twitter:image`.
- **Image:** `og:image` points to `GET /api/og/profile/:personId`, which returns a **server-rendered PNG** (name, WPS, global rank, country flag). Images are cached in memory (max 500, 1h TTL).

### Production setup

1. **Same-origin (recommended):** Run the backend with the frontend build so the same server serves both.
   - Set `PUBLIC_PATH` to the frontend build (e.g. `../frontend/dist` or absolute path).
   - Set `SITE_URL` to the public base URL (e.g. `https://wps-ranking.com`).
   - Then `GET /profile/:personId` is handled by this server: crawlers get meta HTML, browsers get the SPA.
2. **Split frontend/backend:** If the frontend is on another host, that host must either proxy `GET /profile/:personId` to the backend (and serve the returned HTML for crawlers) or replicate the meta logic so crawlers see the correct OG tags.

### Test with Telegram link preview

1. Deploy (or run locally with a tunnel so Telegram can reach your server).
2. Ensure the profile exists and the backend has cache data (e.g. run leaderboard update).
3. Send the profile URL in a Telegram chat (e.g. `https://your-domain.com/profile/2017AMAN04`). Do **not** add a trailing slash.
4. Wait a few seconds. Telegram fetches the URL with a crawler User-Agent and receives the meta HTML, then fetches the OG image from `/api/og/profile/2017AMAN04`.
5. You should see: **Title** like “Max Park — WPS 38.42 (#12 of 186,342)”, **Description** “World Performance Score based on official WCA rankings”, and the **1200×630 card image** with name, WPS, rank, and flag.
6. **Manual check (no Telegram):**  
   - `curl -A "TelegramBot" https://your-domain.com/profile/2017AMAN04` → HTML with `<meta property="og:title" ...>`.  
   - `curl -o preview.png https://your-domain.com/api/og/profile/2017AMAN04` → PNG image.

## 🌍 Data Source

All rankings are calculated using official data from the [World Cube Association](https://www.worldcubeassociation.org). The system automatically fetches and processes competition results to maintain up-to-date rankings.

## 📱 Features in Detail

### Leaderboard
- Displays top 1000 speedcubers globally
- Sortable by WPS score
- Shows country flags and event participation
- Responsive design for all devices

### Search
- Search by name, WCA ID, or country
- Real-time validation for WCA ID format
- Results sorted by WPS score
- Quick access to profiles

### Profiles
- Detailed WPS score breakdown
- Per-event performance analysis
- World rankings for each event
- Visual score indicators

### About Page
- Complete WPS formula explanation
- Event weight documentation
- Philosophy and benefits
- Interactive examples

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [World Cube Association](https://www.worldcubeassociation.org) for providing the data
- Speedcubing community for inspiration and feedback
- Open source contributors and maintainers

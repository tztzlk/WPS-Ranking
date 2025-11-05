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

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd WPS-Ranking
chmod +x setup.sh
./setup.sh
```

2. **Configure environment:**
```bash
# Edit backend/.env with your settings
cp backend/env.example backend/.env
```

3. **Start development servers:**
```bash
npm run dev
```

4. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **API Integration**: WCA API
- **Styling**: Tailwind CSS with dark mode
- **Icons**: Lucide React

### Project Structure
```
WPS Ranking/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── services/  # Business logic
│   │   ├── types/     # TypeScript definitions
│   │   └── middleware/
│   └── package.json
├── frontend/          # React application
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/     # Page components
│   │   ├── services/  # API client
│   │   └── types/     # TypeScript definitions
│   └── package.json
└── package.json       # Root package with scripts
```

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

### Available Scripts

**Root level:**
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build frontend for production
- `npm start` - Start production backend

**Backend:**
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

**Frontend:**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### API Endpoints

- `GET /api/leaderboard` - Global leaderboard
- `GET /api/profile/:wcaId` - Cuber profile
- `GET /api/search?q=query` - Search cubers
- `GET /api/about` - WPS information
- `GET /api/health` - Health check

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- [World Cube Association](https://www.worldcubeassociation.org) for providing the data
- Speedcubing community for inspiration and feedback
- Open source contributors and maintainers

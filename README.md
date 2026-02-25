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

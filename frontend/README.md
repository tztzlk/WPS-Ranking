# WPS Ranking Frontend

This is the frontend application for WPS Ranking, built with React, TypeScript, and Tailwind CSS.

## Features

- **Global Leaderboard**: Display top 1000 speedcubers ranked by WPS score
- **Search Functionality**: Find cubers by name, WCA ID, or country
- **Profile Views**: Detailed performance breakdowns for individual cubers
- **About Page**: Comprehensive explanation of the WPS formula and philosophy
- **Responsive Design**: Dark mode theme optimized for all devices

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to `http://localhost:3000`

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Axios** for API communication

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── services/       # API services
├── types/         # TypeScript type definitions
├── App.tsx        # Main app component
└── main.tsx       # Entry point
```

## API Integration

The frontend communicates with the backend API through the `apiService` module, which handles:
- Leaderboard data fetching
- Profile lookups
- Search functionality
- About page data

## Styling

The application uses Tailwind CSS with a custom dark theme. Key design elements:
- Dark gray background (`bg-gray-900`)
- Green accent color (`text-green-400`)
- Card-based layout with subtle borders
- Responsive grid system
- Smooth transitions and hover effects

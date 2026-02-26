import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { leaderboardRoutes } from './routes/leaderboard';
import { countriesRoutes } from './routes/countries';
import { profileRoutes } from './routes/profile';
import { searchRoutes } from './routes/search';
import { aboutRoutes } from './routes/about';
import { compareRoutes } from './routes/compare';
import { ogRoutes } from './routes/og';
import { ogMetaRoutes } from './routes/ogMeta';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/og', ogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Open Graph meta HTML for profile pages (crawlers only). Must be before static so /profile/:personId is hit.
app.use(ogMetaRoutes);

// Optional: serve frontend build for production (set PUBLIC_PATH to frontend dist)
const publicPath = process.env.PUBLIC_PATH;
if (publicPath) {
  const absolutePath = path.isAbsolute(publicPath) ? publicPath : path.resolve(process.cwd(), publicPath);
  app.use(express.static(absolutePath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(absolutePath, 'index.html'));
  });
} else {
  // 404 for non-API when not serving frontend
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 WPS Ranking API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

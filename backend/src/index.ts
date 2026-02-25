import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { leaderboardRoutes } from './routes/leaderboard';
import { countriesRoutes } from './routes/countries';
import { profileRoutes } from './routes/profile';
import { searchRoutes } from './routes/search';
import { aboutRoutes } from './routes/about';
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

// Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/about', aboutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 WPS Ranking API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

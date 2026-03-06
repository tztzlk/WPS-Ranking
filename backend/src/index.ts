import express, { Request, Response, NextFunction } from 'express';
import compression from 'compression';
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

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
  process.exit(1);
});

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const REQUEST_TIMEOUT_MS = 25_000;

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : ['http://localhost:3000', 'https://wps-ranking.vercel.app', 'http://localhost:5173'];

app.use(helmet());
app.use(compression());
app.use(cors({ origin: corsOrigins, credentials: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ error: 'Request timed out' });
    }
  }, REQUEST_TIMEOUT_MS);
  res.on('finish', () => clearTimeout(timer));

  next();
});

// API Routes
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/og', ogRoutes);

app.get('/api/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  res.status(200).json({ ok: true, env });
});

app.use(ogMetaRoutes);
app.options('*', cors());

const publicPath = process.env.PUBLIC_PATH;
if (publicPath) {
  const absolutePath = path.isAbsolute(publicPath) ? publicPath : path.resolve(process.cwd(), publicPath);
  app.use(express.static(absolutePath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(absolutePath, 'index.html'));
  });
} else {
  app.use('*', (_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WPS Ranking API running on port ${PORT}`);
});

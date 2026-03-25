import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { ensureUploadDirs } from './utils/file.js';
import { startReminderCron } from './cron/reminders.js';
import pool from './db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
ensureUploadDirs();

const app = express();

// Security headers
app.use(helmet());

// CORS: allow all in dev; restrict in production via ALLOWED_ORIGIN
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.ALLOWED_ORIGIN;
if (isProd) {
  if (!allowedOrigin) {
    // eslint-disable-next-line no-console
    console.warn('[CORS] ALLOWED_ORIGIN is not set. Falling back to permissive origin in production.');
    app.use(cors({ origin: true, credentials: true }));
  } else {
    app.use(cors({ origin: allowedOrigin, credentials: true }));
  }
} else {
  app.use(cors({ origin: true, credentials: true }));
}

app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  let db = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('DB health check failed:', err.message || err);
    db = 'error';
  }
  res.status(200).json({ status: 'ok', db });
});

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  if (err.message === 'Only PDF files are allowed' || err.message === 'Only PDF allowed') {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

startReminderCron();

export default app;

import 'dotenv/config'; // Load .env before anything else
import './config/env.js'; // Validate env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
// Bull processors and cron only run outside serverless (Redis not available on Vercel)
// VERCEL_ENV is set at runtime; VERCEL is build-only
const isServerless = !!(process.env.VERCEL_ENV ?? process.env.VERCEL);
let startCronJobs: (() => void) | undefined;
if (!isServerless) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./jobs/processors.js');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  startCronJobs = (require('./jobs/cron.js') as { startCronJobs: () => void }).startCronJobs;
}

const app = express();

// Trust Vercel's reverse proxy so express-rate-limit can read X-Forwarded-For
if (isServerless) app.set('trust proxy', 1);

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: () => env.NODE_ENV === 'test',
  }),
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
// In serverless (Vercel), we export the app without binding to a port.
// Locally, we start the server and cron jobs normally.
if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    logger.info(`🚀 API rodando em http://localhost:${env.PORT}`);
    startCronJobs?.();
  });
}

export default app;

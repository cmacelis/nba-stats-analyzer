import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { healthRouter } from './routes/health';
import { playerRouter } from './routes/players';
import { gamesRouter } from './routes/games';
import { researchRouter } from './api/routes/research';

const app = express();
const port = process.env.PORT || 3000;

// CORS — in production set ALLOWED_ORIGINS to comma-separated Vercel domain(s)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

// Middleware
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type'] }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/players', playerRouter);
app.use('/api/games', gamesRouter);
app.use('/api/research', researchRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 
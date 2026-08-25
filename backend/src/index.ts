import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db';
import { accountsRouter } from './routes/accounts';
import { categoriesRouter } from './routes/categories';
import { transactionsRouter } from './routes/transactions';
import { importRouter } from './routes/import';
import { analyticsRouter } from './routes/analytics';
import { backupRouter } from './routes/backup';
import { telegramRouter } from './routes/telegram';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize SQLite Database and seed tables
initDatabase();

// API Routes
app.use('/api/accounts', accountsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/import', importRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/telegram', telegramRouter);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Personal Finance Tracker API is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if exists
const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Personal Finance Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

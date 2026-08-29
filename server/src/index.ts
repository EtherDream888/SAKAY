import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Admin & TODA Routes
import fareMatrixRoutes from './routes/fareMatrixRoutes';
import todaRoutes from './routes/todaRoutes';
import driverRoutes from './routes/driverRoutes';
import passengerRoutes from './routes/passengerRoutes';
import incidentRoutes from './routes/incidentRoutes';
import announcementRoutes from './routes/announcementRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import todaPortalRoutes from './routes/todaPortalRoutes';
import authRoutes from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176').split(',');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl), matched origins, localhost, or VS Code Dev Tunnels (.devtunnels.ms)
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin.endsWith('.devtunnels.ms')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// System Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SAKAY LGU & TODA Backend API',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Mount Administrative & TODA REST API Routes
app.use('/api/admin/fare-matrix', fareMatrixRoutes);
app.use('/api/admin/todas', todaRoutes);
app.use('/api/admin/drivers', driverRoutes);
app.use('/api/admin/passengers', passengerRoutes);
app.use('/api/admin/incidents', incidentRoutes);
app.use('/api/admin/announcements', announcementRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/toda', todaPortalRoutes);
app.use('/api/auth', authRoutes);

// 404 Catch-All Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server Error]:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 SAKAY Admin Backend Server running on:`);
  console.log(`   ➜ Local: http://localhost:${PORT}`);
  console.log(`   ➜ Health: http://localhost:${PORT}/api/health`);
  console.log(`=============================================`);
});

export default app;

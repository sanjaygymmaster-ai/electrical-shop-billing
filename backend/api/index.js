import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import productRoutes from '../routes/productRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import billRoutes from '../routes/billRoutes.js';
import billingRoutes from '../routes/billingRoutes.js';
import adminRoutes from '../routes/adminRoutes.js';
import resetRoutes from '../routes/resetRoutes.js';

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({ origin: '*' }));

// JSON
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('Electrical Shop Backend API is running'));

// Mount routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reset', resetRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

export default app;


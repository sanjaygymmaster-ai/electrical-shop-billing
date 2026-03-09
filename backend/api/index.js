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
const allowedOrigins = [
  'https://electrical-shop-billing-sanjay.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients (no Origin header) and allowed web origins.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.json({ message: 'API ok' }));

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


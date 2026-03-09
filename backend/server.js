import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import productRoutes from './routes/productRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billRoutes from './routes/billRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import resetRoutes from './routes/resetRoutes.js';

const app = express();

// Security and performance middleware
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({ origin: '*' }));

// JSON
app.use(express.json());

// Health and root routes
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.send('Electrical Shop Backend API is running'));

// API routes
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reset', resetRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const connectDB = async () => {
	try {
		if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in environment');
		await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
		console.log('MongoDB connected successfully');
	} catch (err) {
		console.error('MongoDB connection error:', err.message);
		process.exit(1);
	}
};

const startServer = async () => {
	await connectDB();
	const PORT = process.env.PORT || 5000;
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer();

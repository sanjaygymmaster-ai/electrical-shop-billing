import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Not authorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = {
      ...user.toObject(),
      id: String(user._id),
      _id: String(user._id)
    };
    next();
  } catch {
    res.status(401).json({ error: 'Not authorized' });
  }
};

export const adminOnly = (req, res, next) => {
  const role = String(req?.user?.role || '').toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied' });
  }
  next();
};

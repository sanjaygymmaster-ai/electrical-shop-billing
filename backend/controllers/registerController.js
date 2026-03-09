import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

export const registerUser = async (req, res) => {
  try {
    const { password, name } = req.body;
    const email = normalizeEmail(req.body.email);
    const username = String(req.body.username || '').trim().toLowerCase();

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = await User.create({
      name: name || '',
      email,
      password,
      username,
      role: 'user'
    });

    return res.status(201).json({
      message: 'User created successfully',
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (error?.code === 11000 && error?.keyPattern?.username) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

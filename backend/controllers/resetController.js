import Product from '../models/Product.js';
import Bill from '../models/Bill.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export const resetData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const dbUser = await User.findById(userId);
    if (!dbUser) return res.status(401).json({ error: 'User not found' });

    const givenUsername = String(username).trim().toLowerCase();
    const actualUsername = String(dbUser.username || '').trim().toLowerCase();
    if (!actualUsername || givenUsername !== actualUsername) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isPasswordValid = await bcrypt.compare(String(password), String(dbUser.password || ''));
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await Product.deleteMany({ userId });
    await Bill.deleteMany({ userId });
    await Report.deleteMany({ userId });
    res.json({ message: 'All user data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

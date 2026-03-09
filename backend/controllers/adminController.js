import User from '../models/User.js';

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('_id name email username role createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
};

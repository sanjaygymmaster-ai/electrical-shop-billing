import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  username: { type: String, unique: true, sparse: true, default: '' },
  name: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  password: { type: String, default: '' },
  googleId: { type: String, default: '' },
  resetToken: { type: String, default: '' },
  resetTokenExpiry: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase();
  }
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model('User', userSchema);

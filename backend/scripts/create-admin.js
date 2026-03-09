import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'admin123').trim();

async function main() {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 6) {
    throw new Error('ADMIN_PASSWORD must be at least 6 characters');
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const byEmail = await User.findOne({ email: ADMIN_EMAIL });
  if (byEmail) {
    byEmail.username = ADMIN_USERNAME;
    byEmail.role = 'admin';
    byEmail.password = ADMIN_PASSWORD;
    await byEmail.save();
    console.log(`Updated admin account: ${ADMIN_USERNAME} (${ADMIN_EMAIL})`);
  } else {
    const byUsername = await User.findOne({ username: ADMIN_USERNAME });
    if (byUsername) {
      byUsername.email = ADMIN_EMAIL;
      byUsername.role = 'admin';
      byUsername.password = ADMIN_PASSWORD;
      await byUsername.save();
      console.log(`Updated admin account: ${ADMIN_USERNAME} (${ADMIN_EMAIL})`);
    } else {
      await User.create({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        name: 'Administrator',
        role: 'admin'
      });
      console.log(`Created admin account: ${ADMIN_USERNAME} (${ADMIN_EMAIL})`);
    }
  }

  await mongoose.disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });

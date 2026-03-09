import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  productId: { type: String }, // Changed from ObjectId to String to accept any ID format
  name: String,
  brand: String,
  price: Number,
  qty: Number,
  amount: Number,
  total: Number
}, { _id: false });

const billSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  billNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  phone: { type: String, default: '' },
  items: [itemSchema],
  totalAmount: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['paid', 'pending'], default: 'paid' },
  paidAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Bill', billSchema);

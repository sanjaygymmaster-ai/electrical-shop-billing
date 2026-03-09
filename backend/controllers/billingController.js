import Billing from '../models/Billing.js';

const getUserId = (req) => req?.user?.id || req?.user?._id;

export const createBilling = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    const { productName, quantity, price } = req.body;
    if (!productName || quantity === undefined || price === undefined) {
      return res.status(400).json({ error: 'productName, quantity and price are required' });
    }

    const qty = Number(quantity);
    const unitPrice = Number(price);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
      return res.status(400).json({ error: 'Invalid quantity or price' });
    }

    const billing = await Billing.create({
      userId,
      productName: String(productName).trim(),
      quantity: qty,
      price: unitPrice,
      total: qty * unitPrice
    });

    return res.status(201).json(billing);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to create billing record' });
  }
};

export const listBillingByUser = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const list = await Billing.find({ userId }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch billing records' });
  }
};


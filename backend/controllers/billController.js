import Bill from '../models/Bill.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

const getRequestUserId = (req) => {
  const id = req?.user?.id || req?.user?._id;
  return id ? String(id) : null;
};

const findBillForUser = async (rawId, userId) => {
  if (!rawId || !userId) return null;
  const identifier = String(rawId).trim();
  if (!identifier) return null;

  if (mongoose.isValidObjectId(identifier)) {
    return Bill.findOne({ _id: identifier, userId });
  }

  // Fallback for clients that may pass bill numbers like "B1001".
  return Bill.findOne({ billNumber: identifier, userId });
};

const generateBillNumber = async (userId) => {
  const lastBill = await Bill.findOne({ userId }).sort({ createdAt: -1 });
  const num = lastBill ? parseInt(lastBill.billNumber.replace('B', ''), 10) + 1 : 1001;
  return `B${num}`;
};

export const createBill = async (req, res) => {
  try {
    const { customerName, phone, items, totalAmount, gst, grandTotal, paymentStatus } = req.body;
    
    // Validation
    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    if (totalAmount === undefined || totalAmount === null || isNaN(totalAmount)) {
      return res.status(400).json({ error: 'Valid total amount is required' });
    }
    if (grandTotal === undefined || grandTotal === null || isNaN(grandTotal)) {
      return res.status(400).json({ error: 'Valid grand total is required' });
    }

    console.log('Creating bill with data:', req.body);
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const normalizedStatus = String(paymentStatus || '').trim().toLowerCase();
    const isPayLater = normalizedStatus === 'pending';
    const billNumber = await generateBillNumber(userId);
    
    // Process items - ensure they have required fields
    const billItems = items.map(it => ({
      productId: it.productId || it._id || '',
      name: it.name || '',
      brand: it.brand || '',
      price: Number(it.price) || 0,
      qty: Number(it.qty) || 1,
      amount: Number(it.amount) || 0
    }));

    // Update stock if payment is confirmed (not pending)
    if (!isPayLater) {
      for (const it of billItems) {
        if (it.productId && it.productId.match(/^[0-9a-fA-F]{24}$/)) { // Valid MongoDB ObjectId
          try {
            const p = await Product.findOne({ _id: it.productId, userId });
            if (p) {
              p.stock = Math.max(0, (p.stock || 0) - it.qty);
              p.totalSold = (p.totalSold || 0) + it.qty;
              await p.save();
            }
          } catch (err) {
            console.warn(`Could not update stock for product ${it.productId}:`, err.message);
          }
        }
      }
    }

    const bill = new Bill({
      userId,
      billNumber,
      customerName: customerName.trim(),
      phone: phone || '',
      items: billItems,
      totalAmount: Number(totalAmount),
      gst: Number(gst || 0),
      grandTotal: Number(grandTotal),
      paymentStatus: isPayLater ? 'pending' : 'paid',
      paidAt: isPayLater ? null : new Date()
    });
    
    console.log('Bill object before save:', bill);
    await bill.save();
    console.log('Bill saved successfully:', bill._id);
    res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: error.message || 'Failed to create bill' });
  }
};

export const getBills = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const bills = await Bill.find({ userId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getBillById = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const bill = await findBillForUser(req.params.id, userId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDailySales = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paidBills = await Bill.find({
      userId,
      paymentStatus: 'paid',
      $or: [
        { paidAt: { $gte: today } },
        { paidAt: null, createdAt: { $gte: today } }
      ]
    });
    const pendingBills = await Bill.find({ userId, paymentStatus: 'pending' }).sort({ createdAt: -1 });
    const overdueCutoff = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000));
    const overduePendingBills = pendingBills.filter(b => new Date(b.createdAt) <= overdueCutoff);

    const totalRevenue = paidBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalBills = paidBills.length;
    const recentBills = paidBills.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    const pendingRecent = pendingBills.slice(0, 20).map(b => ({
      billId: b._id,
      billNumber: b.billNumber,
      customerName: b.customerName || '',
      createdAt: b.createdAt,
      grandTotal: b.grandTotal,
      paymentStatus: b.paymentStatus
    }));

    res.json({
      totalRevenue,
      totalBills,
      recentBills,
      count: paidBills.length,
      paidBills,
      pendingBills: pendingRecent,
      overduePendingCount: overduePendingBills.length,
      overduePendingBills: overduePendingBills.map(b => ({
        billId: b._id,
        billNumber: b.billNumber,
        customerName: b.customerName || '',
        createdAt: b.createdAt,
        grandTotal: b.grandTotal,
        paymentStatus: b.paymentStatus
      }))
    });
  } catch (error) {
    console.error('Error in getDailySales:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/bills/monthly?month=MM&year=YYYY
export const getMonthlyReport = async (req, res) => {
  try {
    const m = parseInt(req.query.month, 10);
    const y = parseInt(req.query.year, 10);
    const now = new Date();
    const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : (now.getMonth() + 1);
    const year = Number.isFinite(y) && y > 1970 ? y : now.getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    // paid bills are used for revenue metrics and main report
    const paidBills = await Bill.find({
      userId,
      paymentStatus: 'paid',
      $or: [
        { paidAt: { $gte: start, $lt: end } },
        { paidAt: null, createdAt: { $gte: start, $lt: end } }
      ]
    });
    // pending bills are shown separately
    const monthPendingBills = await Bill.find({
      userId,
      paymentStatus: 'pending',
      createdAt: { $gte: start, $lt: end }
    }).sort({ createdAt: -1 });

    const totalRevenue = paidBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const totalBills = paidBills.length;

    // aggregate product-wise totals from bill items
    const items = paidBills.flatMap(b => {
      const paidDate = b.paidAt || b.createdAt;
      return (b.items || []).map(i => ({
        productId: i.productId ? String(i.productId) : null,
        name: i.name || 'Unknown',
        qty: i.qty || 0,
        revenue: i.total || ((i.price || 0) * (i.qty || 0)),
        createdAt: paidDate
      }));
    });

    const grouped = items.reduce((acc, it) => {
      const key = it.productId || it.name;
      if (!acc[key]) acc[key] = { productId: it.productId, name: it.name, qtySold: 0, revenue: 0 };
      acc[key].qtySold += it.qty;
      acc[key].revenue += it.revenue;
      return acc;
    }, {});

    const products = Object.values(grouped).sort((a, b) => b.revenue - a.revenue);

    // build daily breakdown
    const daysInMonth = new Date(year, month, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, totalRevenue: 0, totalBills: 0 }));
    for (const b of paidBills) {
      const d = new Date(b.paidAt || b.createdAt).getDate();
      daily[d - 1].totalRevenue += (b.grandTotal || 0);
      daily[d - 1].totalBills += 1;
    }

    const recentBills = (paidBills || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(b => ({ billId: b._id, billNumber: b.billNumber, customerName: b.customerName || '', createdAt: (b.paidAt || b.createdAt), grandTotal: b.grandTotal, paymentStatus: b.paymentStatus }));

    const overdueCutoff = new Date(Date.now() - (5 * 24 * 60 * 60 * 1000));
    const overduePendingCount = monthPendingBills.filter(b => new Date(b.createdAt) <= overdueCutoff).length;
    const pendingBills = monthPendingBills.map(b => ({
      billId: b._id,
      billNumber: b.billNumber,
      customerName: b.customerName || '',
      createdAt: b.createdAt,
      grandTotal: b.grandTotal,
      paymentStatus: b.paymentStatus
    }));

    res.json({ month, year, totalRevenue, totalBills, products, daily, recentBills, pendingBills, overduePendingCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Save monthly report to DB (supports optional finalize flag)
import Report from '../models/Report.js';
export const saveMonthlyReport = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const { month, year, finalize } = req.body;
    const m = Number(month);
    const y = Number(year);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const bills = await Bill.find({
      userId,
      paymentStatus: 'paid',
      $or: [
        { paidAt: { $gte: start, $lt: end } },
        { paidAt: null, createdAt: { $gte: start, $lt: end } }
      ]
    });

    const totalRevenue = bills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const totalBills = bills.length;

    const items = bills.flatMap(b => {
      const paidDate = b.paidAt || b.createdAt;
      return (b.items || []).map(i => ({
        productId: i.productId ? String(i.productId) : null,
        name: i.name || 'Unknown',
        qty: i.qty || 0,
        revenue: i.total || ((i.price || 0) * (i.qty || 0)),
        createdAt: paidDate
      }));
    });
    const grouped = items.reduce((acc, it) => {
      const key = it.productId || it.name;
      if (!acc[key]) acc[key] = { productId: it.productId, name: it.name, qtySold: 0, revenue: 0 };
      acc[key].qtySold += it.qty;
      acc[key].revenue += it.revenue;
      return acc;
    }, {});
    const products = Object.values(grouped);

    const daysInMonth = new Date(y, m, 0).getDate();
    const daily = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, totalRevenue: 0, totalBills: 0 }));
    for (const b of bills) {
      const d = new Date(b.paidAt || b.createdAt).getDate();
      daily[d - 1].totalRevenue += (b.grandTotal || 0);
      daily[d - 1].totalBills += 1;
    }

    const recentBills = (bills || [])
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(b => ({ billId: b._id, billNumber: b.billNumber, customerName: b.customerName || '', createdAt: (b.paidAt || b.createdAt), grandTotal: b.grandTotal, paymentStatus: b.paymentStatus }));

    const reportData = { userId, month: m, year: y, totalRevenue, totalBills, products, daily, recentBills, finalized: !!finalize, finalizedAt: finalize ? new Date() : undefined };
    const report = await Report.create(reportData);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const finalizeSavedReport = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const r = await Report.findOne({ _id: req.params.id, userId });
    if (!r) return res.status(404).json({ error: 'Report not found' });
    if (r.finalized) return res.status(400).json({ error: 'Report already finalized' });
    r.finalized = true;
    r.finalizedAt = new Date();
    await r.save();
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const listSavedReports = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSavedReportById = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const r = await Report.findOne({ _id: req.params.id, userId });
    if (!r) return res.status(404).json({ error: 'Report not found' });
    res.json(r);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBill = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const bill = await findBillForUser(req.params.id, userId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (bill.paymentStatus !== 'pending') return res.status(400).json({ error: 'Only Pay Later bills can be edited' });
    const { customerName, phone, items, totalAmount, gst, grandTotal } = req.body;
    const billItems = (items || bill.items).map(i => ({
      ...i,
      total: (i.price || 0) * (i.qty || 1)
    }));
    const sub = billItems.reduce((s, i) => s + i.total, 0);
    const gstVal = gst !== undefined ? Number(gst) : bill.gst;
    const total = Number(totalAmount ?? sub);
    const gTotal = Number(grandTotal ?? total + gstVal);
    bill.customerName = customerName ?? bill.customerName;
    bill.phone = phone ?? bill.phone;
    bill.items = billItems;
    bill.totalAmount = total;
    bill.gst = gstVal;
    bill.grandTotal = gTotal;
    await bill.save();
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markBillPaid = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });
    const bill = await findBillForUser(req.params.id, userId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    if (bill.paymentStatus === 'paid') return res.status(400).json({ error: 'Bill already paid' });
    for (const it of bill.items) {
      if (it.productId) {
        const p = await Product.findOne({ _id: it.productId, userId });
        if (p) {
          const qty = it.qty || 1;
          p.stock = Math.max(0, (p.stock || 0) - qty);
          p.totalSold = (p.totalSold || 0) + qty;
          await p.save();
        }
      }
    }
    bill.paymentStatus = 'paid';
    bill.paidAt = new Date();
    await bill.save();
    res.json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteBill = async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    if (!userId) return res.status(401).json({ error: 'Not authorized' });

    const bill = await findBillForUser(req.params.id, userId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    await Bill.deleteOne({ _id: bill._id, userId });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMonthlyReport, saveMonthlyReport, listSavedMonthlyReports, getSavedMonthlyReport, finalizeSavedMonthlyReport, getBillById, deleteBill } from '../api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(n) {
  return `₹${(n || 0).toFixed(2)}`;
}

function isOverduePendingBill(bill) {
  if (!bill || bill.paymentStatus !== 'pending') return false;
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(bill.createdAt).getTime()) >= fiveDaysMs;
}

function getBillIdentifier(bill) {
  return bill?.billId || bill?._id || bill?.id || bill?.billNumber || null;
}

function sameBill(a, rawId, billNumber) {
  const key = String(rawId || '').trim();
  const num = String(billNumber || '').trim();
  const aId = String(getBillIdentifier(a) || '').trim();
  const aNum = String(a?.billNumber || '').trim();
  return (key && aId === key) || (num && aNum === num);
}

function getDeleteCandidates(billLike) {
  return Array.from(new Set(
    [billLike?.billId, billLike?._id, billLike?.id, billLike?.billNumber]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
  ));
}

export default function Reports() {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(null);
  const [billsForDay, setBillsForDay] = useState([]);
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState(null);
  const userDisplayName = (user?.name || user?.username || user?.email?.split('@')[0] || 'User')
    .toString()
    .trim()
    .toUpperCase();
  const shopDisplayName = userDisplayName.includes('ELECTRICAL SHOP')
    ? userDisplayName
    : `${userDisplayName} ELECTRICAL SHOP`;

  useEffect(() => { load(); }, [month]);
  useEffect(() => { fetchSaved(); }, []);

  async function load() {
    setSelectedDay(null);
    setBillsForDay([]);
    setLoading(true);
    setError('');
    setData(null);
    try {
      const [y, m] = month.split('-').map(Number);
      const res = await getMonthlyReport(m, y);
      setData(res.data);
    } catch (err) {
      // network/backend unavailable -> show demo data as fallback for UX
      if (!err.response) {
        const demo = {
          month: Number(month.split('-')[1]),
          year: Number(month.split('-')[0]),
          totalRevenue: 12450.75,
          totalBills: 18,
          products: [
            { name: 'LED Bulb 9W', qtySold: 120, revenue: 3600 },
            { name: 'Ceiling Fan', qtySold: 6, revenue: 10800 },
            { name: 'Switch Board', qtySold: 20, revenue: 5000 },
            { name: 'Wire 1.5mm', qtySold: 40, revenue: 1800 }
          ],
          daily: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, totalRevenue: Math.round(Math.random() * 1500), totalBills: Math.round(Math.random() * 6) })),
          recentBills: [
            { billId: 'b-demo-1', billNumber: 'B1001', customerName: 'Ramesh', createdAt: new Date().toISOString(), grandTotal: 600, paymentStatus: 'paid' },
            { billId: 'b-demo-2', billNumber: 'B1002', customerName: 'Sita', createdAt: new Date().toISOString(), grandTotal: 4200, paymentStatus: 'paid' },
            { billId: 'b-demo-3', billNumber: 'B1003', customerName: 'Gopal', createdAt: new Date().toISOString(), grandTotal: 450, paymentStatus: 'paid' }
          ],
          pendingBills: [],
          overduePendingCount: 0
        };
        setData(demo);
        setError('Backend unavailable — showing demo data');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load report');
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchSaved() {
    try {
      const res = await listSavedMonthlyReports();
      setSavedReports(res.data || []);
    } catch (e) {
      // ignore — demo mode
    }
  }

  async function finalizeCurrentMonth() {
    if (!data) return;
    setSaving(true);
    setError('');
    try {
      const monthNum = Number(data.month);
      const yearNum = Number(data.year);

      // if already saved and not finalized, finalize the saved report
      const existing = savedReports.find(r => Number(r.month) === monthNum && Number(r.year) === yearNum);
      if (existing) {
        if (existing.finalized) {
          setNotify({ message: 'Month already finalized', report: existing });
          return;
        }
        const res = await finalizeSavedMonthlyReport(existing._id || existing.id);
        const updated = res.data;
        setSavedReports(prev => prev.map(s => (s._id === updated._id || s.id === updated.id) ? updated : s));
        setNotify({ message: 'Month finalized', report: updated });
        downloadCSV(updated);
        return;
      }

      // otherwise save+finalize in one call
      const res = await saveMonthlyReport(monthNum, yearNum, true);
      setSavedReports(prev => [res.data, ...prev]);
      setNotify({ message: 'Month finalized', report: res.data });
      downloadCSV(res.data);
    } catch (err) {
      // demo fallback
      const fake = { id: 'r-demo-' + Date.now(), month: Number(data.month), year: Number(data.year), totalRevenue: data.totalRevenue, totalBills: data.totalBills, products: data.products, daily: data.daily, finalized: true, finalizedAt: new Date(), createdAt: new Date() };
      setSavedReports(prev => [fake, ...prev]);
      setNotify({ message: 'Month finalized (demo)', report: fake });
      downloadCSV(fake);
    } finally {
      setSaving(false);
    }
  }

  function downloadCSV(report = data) {
    if (!report) return;
    const rows = [];
    rows.push([`Monthly report for`, `${report.month}/${report.year}`]);
    rows.push([]);

    // daily breakdown
    rows.push(['Day', 'Revenue (INR)', 'Bills']);
    (report.daily || []).forEach(d => rows.push([d.day, d.totalRevenue.toFixed(2), d.totalBills]));
    rows.push([]);

    // recent bills
    rows.push(['Recent bills']);
    rows.push(['Bill #', 'Date', 'Customer', 'Amount (INR)', 'Status']);
    (report.recentBills || []).forEach(b => rows.push([b.billNumber || b.billId || '', new Date(b.createdAt).toLocaleDateString(), b.customerName || '', (b.grandTotal || 0).toFixed(2), b.paymentStatus || '']));
    rows.push([]);

    rows.push(['Product', 'Quantity sold', 'Revenue (INR)']);
    (report.products || []).forEach(p => rows.push([p.name, p.qtySold, (p.revenue || 0).toFixed(2)]));
    rows.push([]);
    rows.push(['Total bills', report.totalBills]);
    rows.push(['Total revenue', (report.totalRevenue || 0).toFixed(2)]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${report.year}-${String(report.month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printMonthlyReport(report = data) {
    if (!report) return;
    const dailyRows = (report.daily || []).map((d) => `
      <tr><td>${d.day}</td><td>${Number(d.totalRevenue || 0).toFixed(2)}</td><td>${d.totalBills || 0}</td></tr>
    `).join('');
    const billRows = (report.recentBills || []).map((b) => `
      <tr>
        <td>${b.billNumber || b.billId || ''}</td>
        <td>${new Date(b.createdAt).toLocaleDateString()}</td>
        <td>${b.customerName || ''}</td>
        <td>${Number(b.grandTotal || 0).toFixed(2)}</td>
        <td>${String(b.paymentStatus || '').toUpperCase()}</td>
      </tr>
    `).join('');
    const productRows = (report.products || []).map((p) => `
      <tr><td>${p.name || ''}</td><td>${p.qtySold || 0}</td><td>${Number(p.revenue || 0).toFixed(2)}</td></tr>
    `).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
      <head>
        <title>Monthly Report ${report.month}/${report.year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 18px; }
          th, td { border: 1px solid #333; padding: 6px; text-align: left; }
          h3 { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <h2>${shopDisplayName} MONTHLY REPORT</h2>
        <p><strong>Month:</strong> ${report.month}/${report.year}</p>
        <p><strong>Total Revenue:</strong> Rs ${Number(report.totalRevenue || 0).toFixed(2)}</p>
        <p><strong>Total Bills:</strong> ${report.totalBills || 0}</p>
        <h3>Daily Breakdown</h3>
        <table><thead><tr><th>Day</th><th>Revenue</th><th>Bills</th></tr></thead><tbody>${dailyRows}</tbody></table>
        <h3>Recent Bills</h3>
        <table><thead><tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>${billRows}</tbody></table>
        <h3>Products</h3>
        <table><thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead><tbody>${productRows}</tbody></table>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  // Helper: get bills for a specific day
  function getBillsForDay(day) {
    if (!data || !data.recentBills) return [];
    return data.recentBills.filter(bill => {
      const billDate = new Date(bill.createdAt);
      return billDate.getDate() === day && (billDate.getMonth() + 1) === data.month && billDate.getFullYear() === data.year;
    });
  }

  // Helper: get items for a specific day's bills
  function getItemsForDayBills(bills) {
    // If bills have items/products, aggregate them; else, just show bill info
    let items = [];
    bills.forEach(bill => {
      if (bill.items && Array.isArray(bill.items)) {
        bill.items.forEach(item => {
          const found = items.find(i => i.name === item.name);
          if (found) {
            found.qty += item.qty;
            found.amount += item.amount || 0;
          } else {
            items.push({ name: item.name, qty: item.qty, amount: item.amount || 0 });
          }
        });
      }
    });
    return items;
  }

  function handleDayClick(day) {
    setSelectedDay(day);
    const bills = getBillsForDay(day);
    setBillsForDay(bills);
  }

  async function printBillById(rawBillId) {
    try {
      if (!rawBillId) return;
      const res = await getBillById(rawBillId);
      const b = res.data;
      const rows = (b.items || []).map((it) => `
        <tr>
          <td>${it.name || 'Unknown'}</td>
          <td>${Number(it.price || 0).toFixed(2)}</td>
          <td>${it.qty || 1}</td>
          <td>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
        </tr>
      `).join('');
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`
        <html><head><title>Bill ${b.billNumber || ''}</title>
        <style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #333;padding:6px;text-align:left}</style>
        </head><body>
          <h2>${shopDisplayName} BILL</h2>
          <p><strong>Bill #:</strong> ${b.billNumber || ''}</p>
          <p><strong>Date:</strong> ${new Date(b.createdAt).toLocaleString()}</p>
          <p><strong>Customer:</strong> ${b.customerName || ''}</p>
          <table><thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
          <p><strong>Total:</strong> Rs ${Number(b.grandTotal || 0).toFixed(2)}</p>
        </body></html>
      `);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      console.error('Failed to print bill', e);
    }
  }

  async function handleDeleteBillById(rawBillId, billNumber = '') {
    if (!rawBillId) return;
    if (!window.confirm(`Delete bill ${billNumber || ''}?`)) return;
    const candidates = getDeleteCandidates({ billId: rawBillId, billNumber });
    const removeFromView = () => {
      setData((prev) => {
        if (!prev) return prev;
        const target = (prev.recentBills || []).find((b) => sameBill(b, rawBillId, billNumber));
        const nextRecent = (prev.recentBills || []).filter((b) => !sameBill(b, rawBillId, billNumber));
        const isPaid = String(target?.paymentStatus || '').toLowerCase() === 'paid';
        const delta = Number(target?.grandTotal ?? 0) || 0;
        const day = target?.createdAt ? new Date(target.createdAt).getDate() : null;
        const nextDaily = (prev.daily || []).map((d) => {
          if (!day || Number(d.day) !== Number(day) || !isPaid) return d;
          return {
            ...d,
            totalBills: Math.max(0, Number(d.totalBills || 0) - 1),
            totalRevenue: Math.max(0, Number(d.totalRevenue || 0) - delta)
          };
        });
        return {
          ...prev,
          recentBills: nextRecent,
          daily: nextDaily,
          totalBills: isPaid ? Math.max(0, Number(prev.totalBills || 0) - 1) : Number(prev.totalBills || 0),
          totalRevenue: isPaid ? Math.max(0, Number(prev.totalRevenue || 0) - delta) : Number(prev.totalRevenue || 0)
        };
      });
      setBillsForDay((prev) => (prev || []).filter((b) => !sameBill(b, rawBillId, billNumber)));
    };
    try {
      let deleted = false;
      let lastErr = null;
      for (const id of candidates) {
        try {
          await deleteBill(id);
          deleted = true;
          break;
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
          lastErr = err;
        }
      }
      if (!deleted && lastErr) throw lastErr;
      removeFromView();
      setNotify({ message: 'Bill deleted', report: data });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || '';
      if (e?.response?.status === 404 || String(msg).toLowerCase() === 'not found') {
        const firstId = candidates[0];
        let stillExists = false;
        if (firstId) {
          try {
            await getBillById(firstId);
            stillExists = true;
          } catch (checkErr) {
            stillExists = checkErr?.response?.status !== 404;
          }
        }
        if (!stillExists) {
          removeFromView();
          setNotify({ message: 'Bill already deleted', report: data });
          await load();
          return;
        }
        setError('Delete failed on server. Restart backend and try again.');
        return;
      }
      setError(msg || 'Failed to delete bill');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Monthly Reports</h2>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="p-2 border rounded" />
          <button onClick={load} className="py-2 px-3 bg-[#0D47A1] text-white rounded">Refresh</button>
          <button onClick={printMonthlyReport} disabled={!data} className="py-2 px-3 bg-slate-700 text-white rounded disabled:opacity-50">Print Report</button>
          <button onClick={downloadCSV} disabled={!data} className="py-2 px-3 bg-amber-500 text-white rounded disabled:opacity-50">Download CSV</button>
          <button onClick={async () => {
            if (!data) return;
            setSaving(true);
            try {
              const [y, m] = month.split('-').map(Number);
              const res = await saveMonthlyReport(m, y);
              // Add to saved list
              setSavedReports(prev => [res.data, ...prev]);
              setNotify({ message: 'Report saved', report: res.data });
              // automatically show download prompt
              downloadCSV(res.data);
            } catch (err) {
              // demo fallback: create a fake saved report
              const fake = { id: 'r-demo-' + Date.now(), month: Number(month.split('-')[1]), year: Number(month.split('-')[0]), totalRevenue: data.totalRevenue, totalBills: data.totalBills, products: data.products, daily: data.daily, createdAt: new Date() };
              setSavedReports(prev => [fake, ...prev]);
              setNotify({ message: 'Report saved (demo)', report: fake });
            } finally {
              setSaving(false);
            }
          }} disabled={!data || saving} className="py-2 px-3 bg-green-600 text-white rounded">{saving ? 'Saving...' : 'Save report'}</button>

          <button onClick={finalizeCurrentMonth} disabled={!data || saving} className="py-2 px-3 bg-red-600 text-white rounded">{saving ? 'Processing...' : 'Finalize month'}</button>        </div>
      </div>

      {loading && <div className="py-8 text-center text-slate-500">Loading...</div>}
      {error && <div className="py-4 text-sm text-rose-600">{error}</div>}

      {notify && (
        <div className="mb-4 px-4 py-3 bg-emerald-100 text-emerald-800 rounded flex items-center justify-between">
          <div>{notify.message}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadCSV(notify.report)} className="text-sm bg-amber-500 text-white px-3 py-1 rounded">Download</button>
            <button onClick={() => setNotify(null)} className="text-sm px-3 py-1">Dismiss</button>
          </div>
        </div>
      )}

      {data && (
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-slate-500">Report for</div>
              <div className="font-semibold">{data.month}/{data.year}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Total revenue</div>
              <div className="font-bold text-[#0D47A1] text-lg">{formatCurrency(data.totalRevenue)}</div>
              <div className="text-xs text-slate-400">{data.totalBills} bill(s)</div>
            </div>
          </div>

          {Number(data.overduePendingCount || 0) > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              Reminder: {data.overduePendingCount} pending payment(s) are older than 5 days.
            </div>
          )}

          {/* daily breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Daily breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2">Day</th>
                    <th className="py-2">Revenue</th>
                    <th className="py-2">Bills</th>
                    <th className="py-2">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.daily || []).map((d, i) => (
                    <tr
                      key={i}
                      className={`border-b last:border-b-0 ${selectedDay === d.day ? 'bg-amber-100' : ''}`}
                    >
                      <td className="py-2 font-semibold">{d.day}</td>
                      <td className="py-2">{formatCurrency(d.totalRevenue)}</td>
                      <td className="py-2">{d.totalBills}</td>
                      <td className="py-2">
                        <button
                          className="px-3 py-1 bg-amber-500 text-white rounded text-xs"
                          onClick={() => handleDayClick(d.day)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
          {/* Items sold on selected day - full details section */}
          {selectedDay && (
            <div className="my-4 p-4 bg-amber-50 rounded border border-amber-200">
              <h4 className="font-semibold mb-2">Details for {selectedDay}/{data.month}/{data.year}</h4>
              {billsForDay.length ? (
                <>
                  <div className="mb-2 text-sm text-slate-600">{billsForDay.length} bill(s) found</div>
                  <div className="overflow-x-auto mb-2">
                    <table className="w-full text-xs border mb-2">
                      <thead className="text-left text-slate-500 border-b">
                        <tr>
                          <th className="py-1">Bill #</th>
                          <th className="py-1">Customer</th>
                          <th className="py-1">Amount</th>
                          <th className="py-1">Status</th>
                          <th className="py-1">Time</th>
                          <th className="py-1">Print</th>
                          <th className="py-1">Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billsForDay.map((b, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-1">{b.billNumber || b.billId}</td>
                          <td className="py-1">{b.customerName || '-'}</td>
                          <td className="py-1">{formatCurrency(b.grandTotal || 0)}</td>
                          <td className="py-1">{b.paymentStatus || ''}</td>
                          <td className="py-1">{new Date(b.createdAt).toLocaleTimeString()}</td>
                          <td className="py-1">
                            <button
                              onClick={() => printBillById(getBillIdentifier(b))}
                              className="px-2 py-1 bg-slate-700 text-white rounded text-[11px] hover:bg-slate-800"
                            >
                              Print
                            </button>
                          </td>
                          <td className="py-1">
                            <button
                              onClick={() => handleDeleteBillById(getBillIdentifier(b), b.billNumber)}
                              className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] hover:bg-rose-700"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                  {getItemsForDayBills(billsForDay).length ? (
                    <table className="w-full text-sm mb-2">
                      <thead className="text-left text-slate-500 border-b">
                        <tr>
                          <th className="py-2">Item</th>
                          <th className="py-2">Qty</th>
                          <th className="py-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getItemsForDayBills(billsForDay).map((item, idx) => (
                          <tr key={idx} className="border-b last:border-b-0">
                            <td className="py-2">{item.name}</td>
                            <td className="py-2">{item.qty}</td>
                            <td className="py-2">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-sm text-slate-500">No item details available for these bills.</div>
                  )}
                  <div className="text-xs text-slate-400">Click another 'View' button to see details for a different day.</div>
                </>
              ) : (
                <div className="text-sm text-slate-500">No sales recorded for this day.</div>
              )}
            </div>
          )}
                </tbody>
              </table>
            </div>
          </div>

          {/* recent bills */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Recent bills</h4>
            <div>
              {(data.recentBills || []).length ? (
                <div className="space-y-2">
                  {data.recentBills.slice(0, 8).map((b, i) => (
                    <Link key={b.billId || b._id || b.id || i} to={`/bills/${b.billId || b._id || b.id || ''}`} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{b.billNumber || b.billId}</div>
                        <div className="text-xs text-slate-500">{b.customerName || '-'}</div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            printBillById(getBillIdentifier(b));
                          }}
                          className="px-2 py-1 bg-slate-700 text-white rounded text-xs hover:bg-slate-800"
                        >
                          Print
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteBillById(getBillIdentifier(b), b.billNumber);
                          }}
                          className="px-2 py-1 bg-rose-600 text-white rounded text-xs hover:bg-rose-700"
                        >
                          Delete
                        </button>
                        <div>
                        <div className="text-sm text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</div>
                        <div className="font-semibold">{formatCurrency(b.grandTotal || 0)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No bills for this month.</div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Pending Payment Report</h4>
            <div>
              {(data.pendingBills || []).filter((b) => String(b?.paymentStatus || '').toLowerCase() === 'pending').length ? (
                <div className="space-y-2">
                  {(data.pendingBills || [])
                    .filter((b) => String(b?.paymentStatus || '').toLowerCase() === 'pending')
                    .slice(0, 20)
                    .map((b, i) => (
                    <div key={b.billId || b._id || b.id || i} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div>
                        <div className="font-medium">{b.billNumber || b.billId}</div>
                        <div className="text-xs text-slate-500">{b.customerName || '-'}</div>
                        <div className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString()}</div>
                        {isOverduePendingBill(b) && <div className="text-xs text-red-600 font-medium">Reminder 5+ days</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(b.grandTotal || 0)}</div>
                        <div className="text-xs text-red-600 font-medium">pending</div>
                        <Link to={`/bills/${b.billId || b._id || b.id}`} className="inline-block mt-1 text-xs bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600">
                          Edit Bill
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">No pending payments for this month.</div>
              )}
            </div>
          </div>

          {data.products.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty sold</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2">{p.qtySold}</td>
                      <td className="py-2 text-right">{formatCurrency(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-500">No sales recorded for this month.</div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Saved reports</h3>
        {savedReports.length ? (
          <div className="bg-white p-3 rounded-xl shadow space-y-2">
            {savedReports.map((r) => (
              <div key={r._id || r.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.month}/{r.year} {r.finalized && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded ml-2">Finalized</span>}</div>
                  <div className="text-xs text-slate-500">Saved: {new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  {!r.finalized && (
                    <button onClick={async () => {
                      try {
                        const res = await finalizeSavedMonthlyReport(r._id || r.id);
                        setSavedReports(prev => prev.map(s => (s._id === res.data._id || s.id === res.data.id) ? res.data : s));
                        setNotify({ message: 'Report finalized', report: res.data });
                        downloadCSV(res.data);
                      } catch (e) {
                        // ignore
                      }
                    }} className="py-1 px-3 bg-red-600 text-white rounded text-sm">Finalize</button>
                  )}
                  <button onClick={async () => {
                    try {
                      const res = await getSavedMonthlyReport(r._id || r.id);
                      setData(res.data);
                    } catch (e) {
                      setData(r);
                    }
                  }} className="py-1 px-3 bg-slate-100 text-slate-800 rounded text-sm">View</button>
                  <button onClick={async () => {
                    try {
                      const res = await getSavedMonthlyReport(r._id || r.id);
                      downloadCSV(res.data);
                    } catch (e) {
                      downloadCSV(r);
                    }
                  }} className="py-1 px-3 bg-amber-500 text-white rounded text-sm">Download</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">No saved reports yet — click <strong>Save report</strong> to store this month's report.</div>
        )}
      </div>
    </div>
  );
}


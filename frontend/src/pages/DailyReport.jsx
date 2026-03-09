import React, { useEffect, useState } from 'react';
import { getDailySales, getBillById, deleteBill } from '../api';
import { useAuth } from '../context/AuthContext';

function formatCurrency(n) {
  return `Rs ${(n || 0).toFixed(2)}`;
}

function getBillIdentifier(bill) {
  return bill?._id || bill?.billId || bill?.id || bill?.billNumber || null;
}

function sameBill(a, rawId, billNumber) {
  const key = String(rawId || '').trim();
  const num = String(billNumber || '').trim();
  const aId = String(getBillIdentifier(a) || '').trim();
  const aNum = String(a?.billNumber || '').trim();
  return (key && aId === key) || (num && aNum === num);
}

function getDeleteCandidates(bill) {
  return Array.from(new Set(
    [bill?._id, bill?.billId, bill?.id, bill?.billNumber]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
  ));
}

export default function DailyReport() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const userDisplayName = (user?.name || user?.username || user?.email?.split('@')[0] || 'User')
    .toString()
    .trim()
    .toUpperCase();
  const shopDisplayName = userDisplayName.includes('ELECTRICAL SHOP')
    ? userDisplayName
    : `${userDisplayName} ELECTRICAL SHOP`;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getDailySales();
      setData(res.data);
    } catch (err) {
      setError('Failed to load daily sales');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  const paidRecent = (data?.recentBills || []).filter(
    (b) => String(b?.paymentStatus || '').toLowerCase() === 'paid'
  );

  function downloadDailyCSV() {
    if (!data) return;
    const rows = [];
    const today = new Date().toLocaleDateString();
    rows.push(['Daily sales report', today]);
    rows.push(['Paid revenue', (data.totalRevenue || 0).toFixed(2)]);
    rows.push(['Paid bills', data.totalBills || 0]);
    rows.push([]);
    rows.push(['Bill #', 'Date', 'Customer', 'Amount', 'Status']);
    paidRecent.forEach((b) => {
      rows.push([
        b.billNumber || b.billId || b._id || '',
        new Date(b.createdAt).toLocaleString(),
        b.customerName || '',
        Number(b.grandTotal || 0).toFixed(2),
        b.paymentStatus || ''
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printDailyReport() {
    if (!data) return;
    const today = new Date().toLocaleDateString();
    const rows = paidRecent.map((b) => `
      <tr>
        <td>${b.billNumber || b.billId || b._id || ''}</td>
        <td>${new Date(b.createdAt).toLocaleString()}</td>
        <td>${b.customerName || ''}</td>
        <td>${Number(b.grandTotal || 0).toFixed(2)}</td>
        <td>${String(b.paymentStatus || '').toUpperCase()}</td>
      </tr>
    `).join('');
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
      <head>
        <title>Daily Report ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px; text-align: left; }
        </style>
      </head>
      <body>
        <h2>${shopDisplayName} DAILY SALES REPORT</h2>
        <p><strong>Date:</strong> ${today}</p>
        <p><strong>Paid Revenue:</strong> Rs ${Number(data.totalRevenue || 0).toFixed(2)}</p>
        <p><strong>Paid Bills:</strong> ${data.totalBills || 0}</p>
        <table>
          <thead><tr><th>Bill #</th><th>Date</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  async function printBill(bill) {
    try {
      const billId = getBillIdentifier(bill);
      if (!billId) return;
      const res = await getBillById(billId);
      const b = res.data;
      const rows = (b.items || []).map((it) => `
        <tr>
          <td>${it.name || 'Unknown'}</td>
          <td>${Number(it.price || 0).toFixed(2)}</td>
          <td>${it.qty || 1}</td>
          <td>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
        </tr>
      `).join('');
      const billHtml = `
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
      `;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(billHtml);
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      console.error('Failed to print bill', e);
    }
  }

  async function downloadBill(bill) {
    try {
      const billId = getBillIdentifier(bill);
      if (!billId) return;
      const res = await getBillById(billId);
      const b = res.data;
      const rows = (b.items || []).map((it) => `
        <tr>
          <td>${it.name || 'Unknown'}</td>
          <td>${Number(it.price || 0).toFixed(2)}</td>
          <td>${it.qty || 1}</td>
          <td>${((it.price || 0) * (it.qty || 1)).toFixed(2)}</td>
        </tr>
      `).join('');
      const html = `
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
      `;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bill-${b.billNumber || billId}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download bill', e);
      setNotice({ type: 'error', message: 'Failed to download bill' });
    }
  }

  async function handleDeleteBill(bill) {
    const candidates = getDeleteCandidates(bill);
    if (!candidates.length) return;
    if (!window.confirm(`Delete bill ${bill.billNumber || ''}?`)) return;
    const removeFromView = () => {
      const idKey = getBillIdentifier(bill);
      setData((prev) => {
        if (!prev) return prev;
        const target = (prev.recentBills || []).find((b) => sameBill(b, idKey, bill.billNumber));
        const nextRecent = (prev.recentBills || []).filter((b) => !sameBill(b, idKey, bill.billNumber));
        const isPaid = String(target?.paymentStatus || bill?.paymentStatus || '').toLowerCase() === 'paid';
        const delta = Number(target?.grandTotal ?? bill?.grandTotal ?? 0) || 0;
        return {
          ...prev,
          recentBills: nextRecent,
          totalBills: isPaid ? Math.max(0, Number(prev.totalBills || 0) - 1) : Number(prev.totalBills || 0),
          totalRevenue: isPaid ? Math.max(0, Number(prev.totalRevenue || 0) - delta) : Number(prev.totalRevenue || 0)
        };
      });
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
      setNotice({ type: 'success', message: 'Bill deleted successfully' });
      await load();
    } catch (e) {
      const apiMsg = e?.response?.data?.error || '';
      if (e?.response?.status === 404 || String(apiMsg).toLowerCase() === 'not found') {
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
          setNotice({ type: 'success', message: 'Bill already deleted' });
          await load();
          return;
        }
        setNotice({ type: 'error', message: 'Delete failed on server. Restart backend and try again.' });
        return;
      }
      console.error('Failed to delete bill', e);
      setNotice({ type: 'error', message: apiMsg || 'Failed to delete bill' });
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-8 rounded-2xl shadow-2xl border border-yellow-200">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-serif font-bold text-gray-800">Daily Sales Report</h1>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={printDailyReport}
              disabled={!data}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 text-sm font-medium"
            >
              Print Report
            </button>
            <button
              onClick={downloadDailyCSV}
              disabled={!data}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
            >
              Download CSV
            </button>
          </div>
          <p className="text-lg text-gray-600">Only paid bills are included in this report</p>
          <div className="w-24 h-1 bg-yellow-400 mx-auto mt-4 rounded-full"></div>
        </div>
        {notice ? (
          <div className={`mb-4 border px-4 py-2 rounded-lg text-sm ${notice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {notice.message}
          </div>
        ) : null}

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-yellow-400">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Paid Revenue (Today)</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(data?.totalRevenue)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-400">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Paid Bills (Today)</p>
              <p className="text-3xl font-bold text-gray-900">{data?.totalBills || 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-6 border-b border-gray-200 pb-2">Paid Bills Report</h2>
            {paidRecent.length > 0 ? (
              <div className="space-y-4">
                {paidRecent.map((bill) => (
                  <div key={bill._id || bill.billId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 gap-3">
                    <div>
                      <p className="font-medium text-gray-900">Bill #{bill.billNumber}</p>
                      <p className="text-sm text-gray-600">{bill.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(bill.grandTotal)}</p>
                      <p className="text-sm font-medium text-green-600">paid</p>
                    </div>
                    <button
                      onClick={() => printBill(bill)}
                      className="px-3 py-1.5 bg-slate-700 text-white rounded text-xs hover:bg-slate-800"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => downloadBill(bill)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteBill(bill)}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No paid bills recorded today</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

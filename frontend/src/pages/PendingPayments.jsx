import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills, markBillPaid } from '../api';
import UPIQR from '../components/UPIQR';

function formatCurrency(n) {
  return `Rs ${(n || 0).toFixed(2)}`;
}

function isOverduePendingBill(bill) {
  if (!bill || String(bill.paymentStatus || '').toLowerCase() !== 'pending') return false;
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  return (Date.now() - new Date(bill.createdAt).getTime()) >= fiveDaysMs;
}

export default function PendingPayments() {
  const navigate = useNavigate();
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [markingPaid, setMarkingPaid] = useState(false);
  const [signal, setSignal] = useState(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError('');
    try {
      const res = await getBills();
      const list = (res?.data || []).filter(
        (b) => String(b?.paymentStatus || '').toLowerCase() === 'pending'
      );
      setPendingList(list);
    } catch (err) {
      setError('Failed to load pending payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function showSignal(type, message) {
    setSignal({ type, message });
    setTimeout(() => setSignal(null), 2200);
  }

  function openPaymentModal(bill) {
    setSelectedBill({
      ...bill,
      _id: bill?._id || bill?.billId || bill?.id
    });
    setPaymentMethod('cash');
    setShowPaymentModal(true);
  }

  async function confirmPayment() {
    const billId = selectedBill?._id || selectedBill?.billId || selectedBill?.id;
    if (!billId) {
      showSignal('error', 'Invalid bill id');
      return;
    }

    setMarkingPaid(true);
    try {
      await markBillPaid(billId);
      setShowPaymentModal(false);
      setSelectedBill(null);
      await loadPending();
      showSignal('success', `Payment successful via ${paymentMethod}`);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
      if (String(msg).toLowerCase().includes('already paid')) {
        setShowPaymentModal(false);
        setSelectedBill(null);
        await loadPending();
        showSignal('success', 'Bill already marked as paid');
      } else {
        showSignal('error', msg);
      }
    } finally {
      setMarkingPaid(false);
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      {signal && (
        <div
          className={`fixed top-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
            signal.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {signal.message}
        </div>
      )}

      <div className="bg-gradient-to-br from-orange-50 to-red-100 p-8 rounded-2xl shadow-2xl border border-orange-200">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-4xl font-serif font-bold text-gray-800">Pending Payment Report</h1>
            <button
              onClick={loadPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          <p className="text-lg text-gray-600">Pending bills are shown separately here</p>
          <div className="w-24 h-1 bg-orange-400 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          {pendingList.length > 0 ? (
            <div className="space-y-4">
              {pendingList.map((bill) => (
                <div key={bill._id || bill.billId || bill.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium text-gray-900">Bill #{bill.billNumber}</p>
                    <p className="text-sm text-gray-600">{bill.customerName}</p>
                    <p className="text-xs text-gray-500">{new Date(bill.createdAt).toLocaleDateString()}</p>
                    {isOverduePendingBill(bill) && <p className="text-xs font-medium text-red-600">Reminder: pending for 5+ days</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(bill.grandTotal)}</p>
                    <p className="text-sm font-medium text-red-600">pending</p>
                    <button
                      onClick={() => openPaymentModal(bill)}
                      className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Payment Option
                    </button>
                    <button
                      onClick={() => navigate(`/bills/${bill._id || bill.billId || bill.id}`)}
                      className="mt-2 ml-2 text-xs bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600"
                    >
                      Edit Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No pending payments</p>
          )}
        </div>
      </div>

      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Payment Option</h3>
            <p className="text-sm text-gray-600 mb-3">
              Bill #{selectedBill.billNumber} - {formatCurrency(selectedBill.grandTotal)}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>

            {paymentMethod === 'upi' && (
              <div className="mb-3 text-center">
                <p className="text-sm text-gray-600 mb-2">Scan QR code for UPI payment</p>
                <UPIQR amount={selectedBill.grandTotal} />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedBill(null);
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={markingPaid}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:opacity-50"
              >
                {markingPaid ? 'Processing...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

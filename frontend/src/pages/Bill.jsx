import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UPIQR from '../components/UPIQR';

export default function Bill({ billItems = [], onUpdateQuantity, onCreateBill }) {
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [paymentType, setPaymentType] = useState('later');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [message, setMessage] = useState('');

  const total = billItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCreateBill = () => {
    if (!customerName.trim()) {
      setMessage('Please enter customer name');
      return;
    }

    if (billItems.length === 0) {
      setMessage('Please add some products to the bill');
      return;
    }
    setMessage('');

    const totalAmount = total;
    const gst = 0;
    const grandTotal = totalAmount + gst;

    const billData = {
      customerName,
      paymentStatus: paymentType === 'now' ? 'paid' : 'pending',
      items: billItems.map(item => ({
        productId: item._id,
        name: item.name,
        brand: item.brand,
        qty: item.quantity,
        price: item.price,
        amount: item.price * item.quantity
      })),
      totalAmount,
      gst,
      grandTotal
    };

    console.log('Creating bill with data:', billData);
    onCreateBill(billData);

    setCustomerName('');
    setPaymentType('later');
    setPaymentMethod('cash');
  };

  if (billItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-8 rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-2">No Products Added</h2>
          <p className="text-lg">Please add products to create a bill. Go to Home and select products.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl shadow-2xl border border-blue-200 mb-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-serif font-bold text-gray-800">Current Bill</h2>
          <div className="w-24 h-1 bg-blue-400 mx-auto mt-2 rounded-full"></div>
        </div>

        <div className="space-y-4 mb-6">
          {billItems.map(item => (
            <div key={item._id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow border">
              <div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-gray-600">Rs {item.price} each</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQuantity(item._id, item.quantity - 1)}
                    className="w-6 h-6 bg-red-500 text-white rounded hover:bg-red-600 flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                    className="w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => onUpdateQuantity(item._id, 0)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Remove
                </button>
                <div className="text-lg font-bold">Rs {(item.price * item.quantity).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">Total: Rs {total.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Option</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="later">Payment Later</option>
              <option value="now">Payment Now</option>
            </select>
          </div>
        </div>

        {paymentType === 'now' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </div>
        )}

        {paymentType === 'now' && paymentMethod === 'upi' && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600 mb-2">Scan QR code to pay via UPI</p>
            <UPIQR amount={total} />
          </div>
        )}

        {message ? (
          <div className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {message}
          </div>
        ) : null}

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium shadow-lg"
          >
            + Add Another Item
          </button>
          <button
            onClick={handleCreateBill}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-medium shadow-lg"
          >
            {paymentType === 'later' ? 'Create Bill (Payment Later)' : 'Create Bill & Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

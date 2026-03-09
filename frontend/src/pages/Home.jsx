import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBills } from '../api';
import electricalHero from '../assets/electrical-hero.svg';
import { useAuth } from '../context/AuthContext';

export default function Home({ products = [], onAddToBill, onResetAllData, loading, billItemsCount = 0 }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [showMondayNotice, setShowMondayNotice] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const pendingEditBillId = localStorage.getItem('pending-edit-bill-id');
  const userDisplayName = (user?.name || user?.username || user?.email?.split('@')[0] || 'User')
    .toString()
    .trim()
    .toUpperCase();
  const shopDisplayName = userDisplayName.includes('ELECTRICAL SHOP')
    ? userDisplayName
    : `${userDisplayName} ELECTRICAL SHOP`;

  useEffect(() => {
    loadPendingForHome();
  }, []);

  async function loadPendingForHome() {
    try {
      const res = await getBills();
      const allPending = (res?.data || []).filter(
        (b) => String(b?.paymentStatus || '').toLowerCase() === 'pending'
      );
      setPendingCount(allPending.length);

      const now = new Date();
      const isMonday = now.getDay() === 1;
      const mondayKey = `pending-monday-notice-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const alreadyShown = localStorage.getItem(mondayKey) === '1';
      setShowMondayNotice(isMonday && allPending.length > 0 && !alreadyShown);
    } catch (e) {
      console.error('Failed to load pending list for home', e);
      setPendingCount(0);
      setShowMondayNotice(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading products...</div>;

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleProducts = normalizedSearch
    ? products.filter((product) => {
        const name = String(product?.name || '').toLowerCase();
        const brand = String(product?.brand || '').toLowerCase();
        const category = String(product?.category || '').toLowerCase();
        return name.includes(normalizedSearch) || brand.includes(normalizedSearch) || category.includes(normalizedSearch);
      })
    : products;

  const handleLogout = () => {
    logout();
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleResetAll = async () => {
    setResetError('');
    setResetUsername('');
    setResetPassword('');
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    if (resetting) return;
    setShowResetModal(false);
    setResetError('');
  };

  const submitResetAll = async () => {
    if (typeof onResetAllData !== 'function') return;
    if (!resetUsername.trim() || !resetPassword.trim()) {
      setResetError('Username and password are required');
      return;
    }
    setResetting(true);
    setResetError('');
    try {
      await onResetAllData({ username: resetUsername.trim(), password: resetPassword });
      await loadPendingForHome();
      setShowResetModal(false);
      setResetUsername('');
      setResetPassword('');
    } catch (e) {
      console.error('Failed to reset data', e);
      setResetError(e?.response?.data?.error || 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">{shopDisplayName}</h1>
              <p className="text-sm text-gray-500 mt-1">Select products and continue in Bill page for payment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 font-semibold shadow"
            >
              Logout
            </button>
            <button
              onClick={handleResetAll}
              disabled={resetting}
              className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 font-semibold shadow disabled:opacity-60"
            >
              {resetting ? 'Resetting...' : 'Reset Data'}
            </button>
            <button
              onClick={() => navigate('/pending-payments')}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 font-semibold shadow"
            >
              Pending Payments {pendingCount > 0 ? `(${pendingCount})` : ''}
            </button>
            {billItemsCount > 0 && (
              <button
                onClick={() => navigate('/bill')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold shadow-lg flex items-center gap-2"
              >
                View Bill ({billItemsCount})
              </button>
            )}
            {pendingEditBillId && (
              <button
                onClick={() => navigate(`/bills/${pendingEditBillId}`)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold shadow"
              >
                Back to Pending Bill
              </button>
            )}
          </div>
        </div>
      </header>
      <section className="mb-6 bg-white border border-blue-100 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Smart Billing Dashboard</h2>
            <p className="text-sm text-slate-600 mt-1">
              Manage products, create bills quickly, and track pending payments from one place.
            </p>
          </div>
          <img
            src={electricalHero}
            alt="Electrical shop dashboard illustration"
            className="w-full max-h-48 object-contain"
          />
        </div>
      </section>

      <section className="mb-4">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, brand, category"
            className="w-full md:max-w-lg px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <div className="text-sm text-slate-600">
            Showing <strong>{visibleProducts.length}</strong> of <strong>{products.length}</strong>
          </div>
        </div>
      </section>

      {showMondayNotice && (
        <section className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-red-700">Monday Reminder</h2>
            <button
              onClick={() => navigate('/pending-payments')}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
            >
              Open Pending Payments
            </button>
          </div>
          <div className="text-sm text-red-700">
            You have <strong>{pendingCount}</strong> pending payment(s). This reminder is shown once on Monday.
          </div>
          <div className="mt-3">
            <button
              onClick={() => {
                const now = new Date();
                const mondayKey = `pending-monday-notice-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
                localStorage.setItem(mondayKey, '1');
                setShowMondayNotice(false);
              }}
              className="text-xs bg-white text-red-700 border border-red-300 px-3 py-1 rounded hover:bg-red-100"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {visibleProducts.map(product => (
          <div key={product._id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            <p className="text-gray-600">{product.brand}</p>
            <p className="text-green-600 font-bold">Rs {product.price}</p>
            <p className="text-sm text-gray-500">Stock: {product.stock}</p>
            <div className="mt-2">
              <button
                onClick={() => onAddToBill(product)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={product.stock <= 0}
              >
                Add to Bill
              </button>
            </div>
          </div>
        ))}
      </div>
      {!visibleProducts.length && (
        <div className="text-center text-slate-500 py-8 bg-white rounded-xl border border-slate-200">
          No products match your search.
        </div>
      )}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Reset Data</h3>
            <p className="text-sm text-slate-600 mt-1">
              Enter your username and password. This will clear your products, bills, reports, and cart data.
            </p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="Username"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {resetError ? (
                <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {resetError}
                </div>
              ) : null}
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={closeResetModal}
                className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300"
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                onClick={submitResetAll}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={resetting}
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

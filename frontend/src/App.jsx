import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { getProducts, addProduct, updateProduct, deleteProduct, createBill, resetData } from './api';
import Home from './pages/Home';
import Products from './pages/Products';
import Bill from './pages/Bill';
import DailyReport from './pages/DailyReport';
import Reports from './pages/Reports';
import BillDetail from './pages/BillDetail';
import PendingPayments from './pages/PendingPayments';
import Login from './pages/Login';
import Register from './pages/Register';
import Navbar from './components/Navbar';
import AuthLogin from './components/Login';
import AuthSignup from './components/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminUsers from './pages/AdminUsers';
import './index.css';
import './styles/auth.css';

function AuthExample() {
  const [isSignupView, setIsSignupView] = useState(false);

  const handleLogin = (data) => {
    console.log('Login form data:', data);
  };

  const handleSignup = (data) => {
    console.log('Signup form data:', data);
  };

  return isSignupView ? (
    <AuthSignup
      onSwitchToLogin={() => setIsSignupView(false)}
      onSignup={handleSignup}
    />
  ) : (
    <AuthLogin
      onSwitchToSignup={() => setIsSignupView(true)}
      onLogin={handleLogin}
    />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [billItems, setBillItems] = useState(() => {
    const savedBillItems = localStorage.getItem('billItems');
    return savedBillItems ? JSON.parse(savedBillItems) : [];
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [lastPaidBill, setLastPaidBill] = useState(null);

  const userDisplayName = (user?.name || user?.username || user?.email?.split('@')[0] || 'User')
    .toString()
    .trim()
    .toUpperCase();
  const shopDisplayName = userDisplayName.includes('ELECTRICAL SHOP')
    ? userDisplayName
    : `${userDisplayName} ELECTRICAL SHOP`;

  useEffect(() => {
    if (isLoggedIn) {
      loadProducts();
    } else {
      setProducts([]);
      setBillItems([]);
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Save billItems to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('billItems', JSON.stringify(billItems));
  }, [billItems]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), notice?.action ? 7000 : 1800);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    const handleBillItemsReset = () => {
      setBillItems([]);
      localStorage.removeItem('billItems');
    };
    window.addEventListener('bill-items-reset', handleBillItemsReset);
    return () => window.removeEventListener('bill-items-reset', handleBillItemsReset);
  }, []);

  function printBillFromData(bill) {
    if (!bill) return;
    const items = bill.items || [];
    const rows = items.map((item) => `
      <tr>
        <td>${item.name || 'Unknown'}</td>
        <td>${Number(item.price || 0).toFixed(2)}</td>
        <td>${item.qty || 1}</td>
        <td>${((item.price || 0) * (item.qty || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>Bill ${bill.billNumber || ''}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #333; padding: 6px; text-align: left; }
        </style>
      </head>
      <body>
        <h2>${shopDisplayName} BILL</h2>
        <p><strong>Bill #:</strong> ${bill.billNumber || bill._id || ''}</p>
        <p><strong>Date:</strong> ${new Date(bill.createdAt || Date.now()).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${bill.customerName || ''}</p>
        <p><strong>Status:</strong> ${(bill.paymentStatus || '').toUpperCase()}</p>
        <table>
          <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p><strong>Total:</strong> Rs ${Number(bill.grandTotal || 0).toFixed(2)}</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch (e) {
      console.error('Failed to load products', e);
    } finally {
      setLoading(false);
    }
  }

  const handleAddProduct = async (product) => {
    try {
      await addProduct(product);
      await loadProducts();
      return { ok: true };
    } catch (e) {
      console.error('Failed to add product', e);
      return { ok: false, error: e.response?.data?.error || e.message || 'Failed to add product' };
    }
  };

  const handleUpdateProduct = async (id, updatedProduct) => {
    try {
      await updateProduct(id, updatedProduct);
      await loadProducts();
      return { ok: true };
    } catch (e) {
      console.error('Failed to update product', e);
      return { ok: false, error: e.response?.data?.error || e.message || 'Failed to update product' };
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProduct(id);
      await loadProducts();
      return { ok: true };
    } catch (e) {
      console.error('Failed to delete product', e);
      return { ok: false, error: e.response?.data?.error || e.message || 'Failed to delete product' };
    }
  };

  const addToBill = (product) => {
    const existing = billItems.find(item => item._id === product._id);
    if (existing) {
      setBillItems(billItems.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setBillItems([...billItems, { ...product, quantity: 1 }]);
    }
    setNotice({ type: 'success', message: 'Added successfully' });
  };

  const updateBillQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setBillItems(billItems.filter(item => item._id !== id));
    } else {
      setBillItems(billItems.map(item => item._id === id ? { ...item, quantity } : item));
    }
  };

  const clearBill = () => {
    setBillItems([]);
    localStorage.removeItem('billItems');
  };

  const handleResetAllData = async (credentials) => {
    await resetData(credentials);
    clearBill();
    await loadProducts();
  };

  const handleCreateBill = async (billData) => {
    try {
      console.log('Attempting to create bill with:', billData);
      const res = await createBill(billData);
      console.log('Bill created successfully:', res.data);
      const isPaid = String(billData?.paymentStatus || '').toLowerCase() === 'paid';
      if (isPaid) {
        setLastPaidBill(res.data);
        setNotice({ type: 'success', message: 'Payment successful', action: 'print' });
      } else {
        setNotice({ type: 'success', message: 'Bill created successfully' });
      }
      clearBill();
      if (String(billData?.paymentStatus || '').toLowerCase() === 'pending') {
        navigate('/pending-payments');
      } else {
        navigate('/daily-report');
      }
    } catch (e) {
      console.error('Failed to create bill:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Unknown error occurred';
      setNotice({ type: 'error', message: errorMsg });
    }
  };

  const hideNavbar = ['/login', '/register', '/signup', '/auth-example'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {notice ? (
        <div className="fixed top-4 right-4 z-[9999]">
          <div className={`${notice.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium min-w-[220px]`}>
            <div>{notice.message}</div>
            {notice.action === 'print' && lastPaidBill ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => printBillFromData(lastPaidBill)}
                  className="bg-white text-emerald-700 px-2 py-1 rounded text-xs font-semibold"
                >
                  Print Bill
                </button>
                <button
                  onClick={() => setNotice(null)}
                  className="border border-white px-2 py-1 rounded text-xs"
                >
                  Close
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Routes>
          <Route path="/auth-example" element={<AuthExample />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Home
                  products={products}
                  onAddToBill={addToBill}
                  onResetAllData={handleResetAllData}
                  loading={loading}
                  billItemsCount={billItems.length}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products
                  products={products}
                  onAdd={handleAddProduct}
                  onUpdate={handleUpdateProduct}
                  onDelete={handleDeleteProduct}
                  loading={loading}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bill"
            element={
              <ProtectedRoute>
                <Bill billItems={billItems} onUpdateQuantity={updateBillQuantity} onCreateBill={handleCreateBill} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills/:id"
            element={
              <ProtectedRoute>
                <BillDetail onRefresh={loadProducts} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-report"
            element={
              <ProtectedRoute>
                <DailyReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending-payments"
            element={
              <ProtectedRoute>
                <PendingPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      {!hideNavbar && isLoggedIn ? <Navbar billItemsCount={billItems.length} user={user} onLogout={logout} /> : null}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;


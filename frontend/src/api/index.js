import axios from 'axios';

const DEFAULT_BACKEND_ORIGIN = 'https://electrical-shop-backend.onrender.com';

function resolveBackendOrigin() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const origin = envUrl || DEFAULT_BACKEND_ORIGIN;
  return origin.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
}

export const BACKEND_ORIGIN = resolveBackendOrigin();
export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests if available (needed for protected backend routes)
API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('shri-ganesh-user') || 'null');
  const token = localStorage.getItem('token') || user?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message = `Network Error: cannot reach backend (${API.defaults.baseURL}). Check VITE_API_URL and backend availability.`;
    }
    return Promise.reject(error);
  }
);

export const getProducts = () => API.get('/products');
export const addProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const updateStock = (id, stock) => API.patch(`/products/${id}/stock`, { stock });

export const getBills = () => API.get('/bills');
export const getBillById = (id) => API.get(`/bills/${id}`);
export const getDailySales = () => API.get('/bills/daily');
export const getMonthlyReport = (month, year) => API.get('/bills/monthly', { params: { month, year } });
export const saveMonthlyReport = (month, year, finalize = false) => API.post('/bills/monthly/save', { month, year, finalize });
export const listSavedMonthlyReports = () => API.get('/bills/monthly/saved');
export const getSavedMonthlyReport = (id) => API.get(`/bills/monthly/saved/${id}`);
export const finalizeSavedMonthlyReport = (id) => API.post(`/bills/monthly/saved/${id}/finalize`);
export const createBill = (data) => API.post('/bills', data);
export const updateBill = (id, data) => API.put(`/bills/${id}`, data);
export const markBillPaid = (id) => API.patch(`/bills/${id}/paid`);
export const deleteBill = (id) => API.delete(`/bills/${id}`);
export const getAdminUsers = () => API.get('/admin/users');

export const resetData = (credentials) => API.post('/reset', credentials);

export default API;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Show a helpful warning on deployed sites if the frontend is still pointed
  // to the localhost API (common cause of signup/login failures).
  const apiPointsToLocalhostOnProd =
    (import.meta.env.VITE_API_URL || '').startsWith('http://localhost') &&
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // client-side validation to avoid server 400s
    const trimmedEmail = email?.trim() || '';
    const trimmedUsername = username?.trim() || '';
    if (!trimmedEmail || !trimmedUsername || !password) {
      setError('Email, username, and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const API = (await import('../api')).default;
      const res = await API.post('/auth/signup', { email: trimmedEmail, username: trimmedUsername, password });

      // Server returns token -> sign in immediately
      if (res.data?.token) {
        login(res.data, res.data.token);
        navigate('/');
        return;
      }

      // Fallback: if signup succeeded but no token returned, try login endpoint
      try {
        const loginRes = await API.post('/auth/login', { username: trimmedUsername, password });
        if (loginRes.data?.token) {
          login(loginRes.data, loginRes.data.token);
          navigate('/');
          return;
        }
      } catch (loginErr) {
        // ignore — will fall back to redirect to login page
        console.error('Fallback login failed after signup:', loginErr.response?.data || loginErr.message);
      }

      // If we get here, signup created the account but we couldn't obtain a token — send user to login with a helpful message
      navigate('/login', { state: { fromSignup: true, email: trimmedEmail } });
    } catch (err) {
      console.error('Signup error:', err.response?.data || err.message);
      const msg =
        err.response?.data?.error ||
        (err.request ? 'Network error — backend unreachable (check VITE_API_URL)' : err.message) ||
        'Signup failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-[#0D47A1] text-center mb-2">Shri Ganesh Electricals</h1>
        <p className="text-slate-500 text-center text-sm mb-6">Create your account</p>
        {apiPointsToLocalhostOnProd && (
          <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 text-sm rounded">
            Warning: frontend is configured to use the local API (http://localhost). On Netlify this will fail — set <code>VITE_API_URL</code> in Netlify Site → Settings → Build & deploy → Environment to your backend URL (e.g. https://electrical-shop-backend.onrender.com/api).
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-4">
          <div>
            <label className="text-sm text-slate-600 block mb-1">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full p-3 rounded-lg border" placeholder="choose a username" />
          </div>
          <div>
            <label className="text-sm text-slate-600 block mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 rounded-lg border" placeholder="your@email.com" />
          </div>
          <div className="relative">
            <label className="text-sm text-slate-600 block mb-1">Password</label>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="w-full pr-10 p-3 rounded-lg border" placeholder="Min 6 characters" />
            <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-700">
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.965 9.965 0 012.223-3.396M9.88 9.88A3 3 0 0114.12 14.12M6.1 6.1l11.8 11.8"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7s-8.268-2.943-9.542-7z"/></svg>
              )}
            </button>
          </div>
          {error && <div className="text-rose-600 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-[#0D47A1] text-white py-3 rounded-lg font-semibold disabled:opacity-70">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="text-[#0D47A1] font-medium">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}

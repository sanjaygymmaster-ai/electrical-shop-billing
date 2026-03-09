import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Captcha, { makeCaptcha } from '../components/Captcha';
import '../components/Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaText, setCaptchaText] = useState(makeCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || !password || !captchaInput.trim()) {
      setError('Username, password and captcha are required');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaText) {
      setError('Invalid CAPTCHA');
      setCaptchaText(makeCaptcha());
      setCaptchaInput('');
      return;
    }

    setLoading(true);
    try {
      const API = (await import('../api')).default;
      const res = await API.post('/auth/login', { username: trimmedUsername, password });
      login(res.data, res.data.token);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
      setCaptchaText(makeCaptcha());
      setCaptchaInput('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">Electrical Shop Login</h1>
        <p className="auth-subtitle">Sign in to access your billing dashboard</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="auth-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="auth-input"
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="auth-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="auth-label">CAPTCHA</label>
            <Captcha
              captchaText={captchaText}
              inputValue={captchaInput}
              setInputValue={setCaptchaInput}
              onRefresh={() => {
                setCaptchaText(makeCaptcha());
                setCaptchaInput('');
              }}
            />
          </div>

          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>

          {location.state?.fromSignup && (
            <div className="auth-success">Account created. Please sign in.</div>
          )}
          {error ? <div className="auth-error">{error}</div> : null}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="auth-linkline">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="auth-link">
              Create account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { API_BASE_URL } from '../api';

function Login({ onSwitchToSignup, onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    if (onLogin) {
      onLogin(formData);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign in</h1>
        <p className="auth-subtitle">Use your account to continue</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
            />
            {errors.email ? <span className="auth-error">{errors.email}</span> : null}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
            {errors.password ? <span className="auth-error">{errors.password}</span> : null}
          </div>

          <button className="auth-btn auth-btn-primary" type="submit">
            Login
          </button>

          <button className="auth-btn auth-btn-google" type="button" onClick={handleGoogleLogin}>
            <svg
              className="google-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.225 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.136 6.053 29.34 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.006 13 24 13c3.059 0 5.842 1.154 7.955 3.045l5.657-5.657C34.136 6.053 29.34 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.236 0 10.029-2.006 13.607-5.268l-6.284-5.32C29.245 35.091 26.715 36 24 36c-5.204 0-9.617-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.793 2.259-2.242 4.194-3.98 5.412l.003-.002 6.284 5.32C37.163 38.558 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Login with Google
          </button>
        </form>

        <p className="auth-switch-text">
          New here?
          <button className="auth-switch-btn" type="button" onClick={onSwitchToSignup}>
            Create Account
          </button>
        </p>
      </div>
    </section>
  );
}

export default Login;

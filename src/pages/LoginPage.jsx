import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import * as apiClient from '../apiClient.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setError, error } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = isLogin
        ? await apiClient.login(formData.email, formData.password)
        : await apiClient.register(formData.email, formData.username, formData.password);

      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">🎸 PerformerHub</h1>
        <p className="login-subtitle">Band Management & Setlist Organizer</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-tabs">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`login-tab-btn ${isLogin ? 'active' : ''}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`login-tab-btn ${!isLogin ? 'active' : ''}`}
            >
              Register
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          {!isLogin && (
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required={!isLogin}
              className="login-input"
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            className="login-input"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="login-input"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit-btn"
          >
            {isSubmitting ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}

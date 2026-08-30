import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Alert } from '../../components/common/Alert.jsx';
import { UserRole } from '../../constants/roles.js';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      // Redirect based on role or previous location
      if (from) {
        navigate(from, { replace: true });
      } else if (user.role === UserRole.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === UserRole.SELLER) {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/marketplace', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(demoEmail, demoPassword);
      if (user.role === UserRole.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === UserRole.SELLER) {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/marketplace', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h2>Welcome Back</h2>
          <p>Sign in to your Marketplace account</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="demo-credentials-section">
          <p className="demo-header">⚡ Quick Demo Evaluation Logins:</p>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleQuickDemoLogin('admin@test.com', 'Password123!')}
              disabled={isSubmitting}
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleQuickDemoLogin('seller@test.com', 'Password123!')}
              disabled={isSubmitting}
            >
              💼 Seller
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => handleQuickDemoLogin('buyer@test.com', 'Password123!')}
              disabled={isSubmitting}
            >
              🛒 Buyer
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

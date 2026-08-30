import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { Alert } from '../../components/common/Alert.jsx';
import { UserRole } from '../../constants/roles.js';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(UserRole.BUYER);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await register({ name, email, password, role });
      if (user.role === UserRole.SELLER) {
        navigate('/seller/dashboard', { replace: true });
      } else {
        navigate('/marketplace', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <h2>Create an Account</h2>
          <p>Join as a Buyer or Seller</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name / Business Name</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Smith / Acme Media"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="alex@example.com"
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
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Select Your Account Role</label>
            <div className="role-selector-grid">
              <label
                className={`role-option-card ${role === UserRole.BUYER ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={UserRole.BUYER}
                  checked={role === UserRole.BUYER}
                  onChange={() => setRole(UserRole.BUYER)}
                />
                <div className="role-option-info">
                  <span className="role-icon">🛒</span>
                  <span className="role-title">Buyer</span>
                  <span className="role-desc">Browse & place orders</span>
                </div>
              </label>

              <label
                className={`role-option-card ${role === UserRole.SELLER ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="role"
                  value={UserRole.SELLER}
                  checked={role === UserRole.SELLER}
                  onChange={() => setRole(UserRole.SELLER)}
                />
                <div className="role-option-info">
                  <span className="role-icon">💼</span>
                  <span className="role-title">Seller</span>
                  <span className="role-desc">List & fulfill orders</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

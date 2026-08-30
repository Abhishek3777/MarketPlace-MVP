import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { UserRole } from '../../constants/roles.js';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/marketplace" className="navbar-logo">
          <span className="logo-badge">⚡</span>
          <span className="logo-text">MarketPlace <small className="logo-sub">MVP</small></span>
        </Link>

        <div className="navbar-links">
          <Link
            to="/marketplace"
            className={`nav-link ${isActive('/marketplace') ? 'active' : ''}`}
          >
            Marketplace
          </Link>

          {/* BUYER Navigation */}
          {isAuthenticated && user?.role === UserRole.BUYER && (
            <Link
              to="/buyer/orders"
              className={`nav-link ${isActive('/buyer/orders') ? 'active' : ''}`}
            >
              My Orders
            </Link>
          )}

          {/* SELLER Navigation */}
          {isAuthenticated && user?.role === UserRole.SELLER && (
            <>
              <Link
                to="/seller/dashboard"
                className={`nav-link ${isActive('/seller/dashboard') ? 'active' : ''}`}
              >
                My Listings
              </Link>
              <Link
                to="/seller/orders"
                className={`nav-link ${isActive('/seller/orders') ? 'active' : ''}`}
              >
                Seller Orders
              </Link>
              <Link
                to="/seller/listings/new"
                className="btn btn-sm btn-primary"
              >
                + New Listing
              </Link>
            </>
          )}

          {/* ADMIN Navigation */}
          {isAuthenticated && user?.role === UserRole.ADMIN && (
            <Link
              to="/admin/dashboard"
              className={`nav-link nav-admin ${isActive('/admin/dashboard') ? 'active' : ''}`}
            >
              🛡️ Admin Dashboard
            </Link>
          )}
        </div>

        <div className="navbar-auth">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className={`user-role-badge role-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline-danger"
                title="Logout"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-sm btn-outline">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

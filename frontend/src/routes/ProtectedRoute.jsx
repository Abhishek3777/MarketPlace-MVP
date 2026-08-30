import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Spinner } from '../components/common/Spinner.jsx';

export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Spinner message="Authenticating session..." size="lg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="container app-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 style={{ color: 'var(--status-rejected-text)', marginBottom: '1rem' }}>
            🚫 Access Denied
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Your account role (<strong>{user?.role}</strong>) does not have permission to view this page.
          </p>
          <a href="/marketplace" className="btn btn-primary">
            Return to Marketplace
          </a>
        </div>
      </div>
    );
  }

  return children;
};

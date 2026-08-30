import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="container app-container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
      <div className="card" style={{ maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--primary-600)', marginBottom: '0.5rem' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/marketplace" className="btn btn-primary">
          ← Return to Marketplace
        </Link>
      </div>
    </div>
  );
};

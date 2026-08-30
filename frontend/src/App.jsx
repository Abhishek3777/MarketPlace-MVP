import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Health check failed:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app-container">
      <header style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-700)' }}>
          Mini Marketplace MVP
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Phase 1: Project Foundation & Architecture Setup
        </p>
      </header>

      <main style={{ display: 'grid', gap: '1.5rem', maxWidth: '640px' }}>
        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            System Status
          </h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Checking API connection...</p>
          ) : health?.success ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className="badge badge-completed">Backend Connected</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{health.env}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {health.message} • {new Date(health.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <span className="badge badge-pending">Waiting for Backend Start</span>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Order State Machine Badges
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-pending">PENDING</span>
            <span className="badge badge-approved">APPROVED</span>
            <span className="badge badge-completed">COMPLETED</span>
            <span className="badge badge-rejected">REJECTED</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;

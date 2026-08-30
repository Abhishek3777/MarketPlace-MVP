import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { orderApi } from '../../services/order.service.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';

export const BuyerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.successMessage || null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getOrders();
      setOrders(res.data?.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Placed Orders</h1>
          <p className="page-subtitle">
            Track your order fulfillment workflow, approval status, and deliverables
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-sm btn-outline">
          🔄 Refresh Orders
        </button>
      </header>

      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner message="Loading your orders..." />
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">🛒</span>
          <h3>No Orders Placed Yet</h3>
          <p>You haven't purchased any marketplace listings yet.</p>
          <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Explore Marketplace Listings
          </Link>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Listing Title</th>
                  <th>Seller</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Placed On</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-muted">
                      <span title={order.id}>#{order.id.substring(0, 8)}...</span>
                    </td>
                    <td>
                      <Link
                        to={`/listings/${order.listingId}`}
                        className="table-link"
                      >
                        <strong>{order.listing?.title || 'Listing'}</strong>
                      </Link>
                      <div className="text-muted text-sm">{order.listing?.category}</div>
                    </td>
                    <td>
                      <div>{order.seller?.name || 'Seller'}</div>
                      <div className="text-muted text-sm">{order.seller?.email}</div>
                    </td>
                    <td>
                      <strong className="text-primary">
                        ${Number(order.amount).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

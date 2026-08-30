import { useState, useEffect } from 'react';
import { orderApi } from '../../services/order.service.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { OrderStatus } from '../../constants/roles.js';

export const SellerOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Complete order modal state
  const [completingOrder, setCompletingOrder] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getOrders();
      setOrders(res.data?.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch incoming orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCompleteOrder = async () => {
    if (!completingOrder) return;
    setIsCompleting(true);
    setError(null);

    try {
      await orderApi.complete(completingOrder.id);
      setSuccess(`Order #${completingOrder.id.substring(0, 8)} successfully marked as COMPLETED!`);
      setCompletingOrder(null);
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to complete order');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Seller Orders Fulfillment</h1>
          <p className="page-subtitle">
            Manage incoming orders from buyers and fulfill approved placements
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-sm btn-outline">
          🔄 Refresh
        </button>
      </header>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <Spinner message="Loading incoming orders..." />
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📥</span>
          <h3>No Orders Received Yet</h3>
          <p>Incoming orders from buyers will appear here for fulfillment.</p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Listing</th>
                  <th>Buyer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-muted">
                      #{order.id.substring(0, 8)}...
                    </td>
                    <td>
                      <strong>{order.listing?.title || 'Listing'}</strong>
                    </td>
                    <td>
                      <div>{order.buyer?.name || 'Buyer'}</div>
                      <div className="text-muted text-sm">{order.buyer?.email}</div>
                    </td>
                    <td>
                      <strong className="text-primary">${Number(order.amount).toFixed(2)}</strong>
                    </td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {order.status === OrderStatus.APPROVED ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => setCompletingOrder(order)}
                        >
                          ✓ Mark Completed
                        </button>
                      ) : order.status === OrderStatus.PENDING ? (
                        <span className="text-muted text-sm italic">
                          Awaiting Admin Approval
                        </span>
                      ) : (
                        <span className="text-muted text-sm">No action required</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      <Modal
        isOpen={!!completingOrder}
        title="Confirm Order Completion"
        onClose={() => !isCompleting && setCompletingOrder(null)}
      >
        <div>
          <p>
            Are you sure you have fulfilled the deliverable for order{' '}
            <strong>#{completingOrder?.id.substring(0, 8)}</strong>?
          </p>
          <div className="order-summary-box" style={{ margin: '1rem 0' }}>
            <strong>{completingOrder?.listing?.title}</strong>
            <div>Buyer: {completingOrder?.buyer?.name} ({completingOrder?.buyer?.email})</div>
            <div>Amount: ${Number(completingOrder?.amount || 0).toFixed(2)}</div>
          </div>
          <p className="text-muted text-sm">
            Marking this order as <strong>COMPLETED</strong> is final and cannot be undone.
          </p>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setCompletingOrder(null)}
              disabled={isCompleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleCompleteOrder}
              disabled={isCompleting}
            >
              {isCompleting ? 'Completing...' : 'Confirm Completed'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

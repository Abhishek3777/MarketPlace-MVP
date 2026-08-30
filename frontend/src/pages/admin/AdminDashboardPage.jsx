import { useState, useEffect } from 'react';
import { adminApi } from '../../services/admin.service.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { OrderStatus } from '../../constants/roles.js';

export const AdminDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Action modal states
  const [approvingOrder, setApprovingOrder] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await adminApi.getOrders(params);
      setOrders(res.data?.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleApprove = async () => {
    if (!approvingOrder) return;
    setIsProcessing(true);
    setError(null);

    try {
      await adminApi.approveOrder(approvingOrder.id);
      setSuccess(`Order #${approvingOrder.id.substring(0, 8)} successfully APPROVED! The seller can now fulfill it.`);
      setApprovingOrder(null);
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to approve order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingOrder) return;
    setIsProcessing(true);
    setError(null);

    try {
      await adminApi.rejectOrder(rejectingOrder.id);
      setSuccess(`Order #${rejectingOrder.id.substring(0, 8)} REJECTED.`);
      setRejectingOrder(null);
      await fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to reject order');
    } finally {
      setIsProcessing(false);
    }
  };

  // Metrics summary
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === OrderStatus.PENDING).length;
  const approvedCount = orders.filter((o) => o.status === OrderStatus.APPROVED).length;
  const completedCount = orders.filter((o) => o.status === OrderStatus.COMPLETED).length;
  const rejectedCount = orders.filter((o) => o.status === OrderStatus.REJECTED).length;

  return (
    <div className="admin-dashboard-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">🛡️ Admin Marketplace Dashboard</h1>
          <p className="page-subtitle">
            Order workflow administration, review queue, and compliance moderation
          </p>
        </div>
        <button onClick={fetchOrders} className="btn btn-sm btn-outline">
          🔄 Refresh Feed
        </button>
      </header>

      {/* Metrics Cards */}
      <div className="admin-metrics-grid">
        <div className="card metric-card">
          <span className="metric-label">All Orders</span>
          <span className="metric-value">{totalOrdersCount}</span>
        </div>
        <div className="card metric-card metric-pending">
          <span className="metric-label">⏳ Pending Review</span>
          <span className="metric-value">{pendingCount}</span>
        </div>
        <div className="card metric-card metric-approved">
          <span className="metric-label">✓ Approved (In Progress)</span>
          <span className="metric-value">{approvedCount}</span>
        </div>
        <div className="card metric-card metric-completed">
          <span className="metric-label">★ Completed</span>
          <span className="metric-value">{completedCount}</span>
        </div>
        <div className="card metric-card metric-rejected">
          <span className="metric-label">✕ Rejected</span>
          <span className="metric-value">{rejectedCount}</span>
        </div>
      </div>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Status Filter Tabs */}
      <div className="card filter-tabs-card">
        <div className="filter-tabs">
          {['ALL', OrderStatus.PENDING, OrderStatus.APPROVED, OrderStatus.COMPLETED, OrderStatus.REJECTED].map(
            (st) => (
              <button
                key={st}
                className={`filter-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <Spinner message="Loading marketplace orders for administration..." />
      ) : orders.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">🛡️</span>
          <h3>No Orders In This View</h3>
          <p>There are no marketplace orders matching the selected filter ({statusFilter}).</p>
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
                  <th>Seller</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Admin Action</th>
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
                      <div>{order.buyer?.name}</div>
                      <div className="text-muted text-sm">{order.buyer?.email}</div>
                    </td>
                    <td>
                      <div>{order.seller?.name}</div>
                      <div className="text-muted text-sm">{order.seller?.email}</div>
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
                      {order.status === OrderStatus.PENDING ? (
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => setApprovingOrder(order)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => setRejectingOrder(order)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-sm">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      <Modal
        isOpen={!!approvingOrder}
        title="Approve Order"
        onClose={() => !isProcessing && setApprovingOrder(null)}
      >
        <div>
          <p>
            Approve order <strong>#{approvingOrder?.id.substring(0, 8)}</strong>?
          </p>
          <div className="order-summary-box" style={{ margin: '1rem 0' }}>
            <strong>{approvingOrder?.listing?.title}</strong>
            <div>Buyer: {approvingOrder?.buyer?.name} ({approvingOrder?.buyer?.email})</div>
            <div>Seller: {approvingOrder?.seller?.name} ({approvingOrder?.seller?.email})</div>
            <div>Amount: ${Number(approvingOrder?.amount || 0).toFixed(2)}</div>
          </div>
          <p className="text-muted text-sm">
            Status will transition from <strong>PENDING</strong> to <strong>APPROVED</strong>. The seller will be authorized to complete the deliverable.
          </p>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setApprovingOrder(null)}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleApprove}
              disabled={isProcessing}
            >
              {isProcessing ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingOrder}
        title="Reject Order"
        onClose={() => !isProcessing && setRejectingOrder(null)}
      >
        <div>
          <p>
            Reject order <strong>#{rejectingOrder?.id.substring(0, 8)}</strong>?
          </p>
          <div className="order-summary-box" style={{ margin: '1rem 0' }}>
            <strong>{rejectingOrder?.listing?.title}</strong>
            <div>Buyer: {rejectingOrder?.buyer?.name}</div>
            <div>Amount: ${Number(rejectingOrder?.amount || 0).toFixed(2)}</div>
          </div>
          <p className="text-danger text-sm" style={{ color: 'var(--status-rejected-text)' }}>
            Status will transition from <strong>PENDING</strong> to <strong>REJECTED</strong>. This is a terminal state and cannot be undone.
          </p>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setRejectingOrder(null)}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

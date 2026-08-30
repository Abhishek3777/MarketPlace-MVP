import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingApi } from '../../services/listing.service.js';
import { orderApi } from '../../services/order.service.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { UserRole } from '../../constants/roles.js';

export const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Order placement state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);

  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listingApi.getById(id);
        setListing(res.data?.listing);
      } catch (err) {
        setError(err.message || 'Listing not found');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handlePlaceOrder = async () => {
    setOrderError(null);
    setIsPlacingOrder(true);

    try {
      await orderApi.create(listing.id);
      setIsModalOpen(false);
      navigate('/buyer/orders', {
        state: { successMessage: `Order placed successfully for "${listing.title}"! Initial status is PENDING.` },
      });
    } catch (err) {
      setOrderError(err.message || 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) return <Spinner message="Loading listing details..." />;
  if (error || !listing) {
    return (
      <div className="card empty-state" style={{ maxWidth: '600px', margin: '3rem auto' }}>
        <span className="empty-icon">⚠️</span>
        <h3>Listing Not Found</h3>
        <p>{error || 'The requested listing does not exist or has been removed.'}</p>
        <Link to="/marketplace" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          ← Back to Marketplace
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === listing.sellerId;
  const isBuyer = user?.role === UserRole.BUYER;
  const isSeller = user?.role === UserRole.SELLER;

  return (
    <div className="listing-detail-page">
      <Link to="/marketplace" className="back-link">
        ← Back to Marketplace
      </Link>

      <div className="listing-detail-grid">
        {/* Main Content */}
        <div className="card listing-detail-card">
          <div className="detail-meta-header">
            <span className="listing-category-badge">{listing.category}</span>
            <StatusBadge status={listing.status} />
          </div>

          <h1 className="detail-title">{listing.title}</h1>

          <div className="detail-description-box">
            <h3>Description & Deliverables</h3>
            <p className="detail-description-text">{listing.description}</p>
          </div>

          <div className="seller-profile-card">
            <h4>Seller Information</h4>
            <div className="seller-profile-row">
              <span className="seller-avatar-lg">💼</span>
              <div>
                <strong>{listing.seller?.name || 'Verified Publisher'}</strong>
                <p className="seller-email">{listing.seller?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing / CTA Card */}
        <div className="card purchase-card">
          <span className="purchase-label">Price per Order</span>
          <div className="purchase-price">${Number(listing.price).toFixed(2)}</div>
          <p className="purchase-note">
            Snapshot price locked at time of order creation.
          </p>

          <div className="purchase-actions">
            {!isAuthenticated ? (
              <div className="auth-prompt-box">
                <p>Sign in as a Buyer to place an order.</p>
                <Link
                  to="/login"
                  state={{ from: { pathname: `/listings/${listing.id}` } }}
                  className="btn btn-primary btn-block"
                >
                  Sign In to Order
                </Link>
              </div>
            ) : isOwner ? (
              <div className="info-banner">
                <span>ℹ️ You are the owner of this listing.</span>
              </div>
            ) : isSeller ? (
              <div className="info-banner">
                <span>ℹ️ Seller accounts cannot place orders. Sign in as a Buyer to purchase.</span>
              </div>
            ) : isBuyer ? (
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-primary btn-block btn-lg"
                disabled={listing.status !== 'ACTIVE'}
              >
                {listing.status === 'ACTIVE' ? '🛒 Place Order Now' : 'Listing is Inactive'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        title="Confirm Order Placement"
        onClose={() => !isPlacingOrder && setIsModalOpen(false)}
      >
        <div className="order-modal-content">
          <p>
            You are about to place an order for:
          </p>
          <div className="order-summary-box">
            <strong>{listing.title}</strong>
            <div className="order-summary-price">
              Total Amount: <span>${Number(listing.price).toFixed(2)}</span>
            </div>
            <small>Initial Order Status: <strong>PENDING</strong> (Awaiting Admin Review)</small>
          </div>

          {orderError && <Alert type="error" message={orderError} />}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isPlacingOrder}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? 'Processing...' : 'Confirm & Place Order'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

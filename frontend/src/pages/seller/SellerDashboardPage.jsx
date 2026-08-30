import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingApi } from '../../services/listing.service.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { Modal } from '../../components/common/Modal.jsx';

export const SellerDashboardPage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Deactivation confirmation modal state
  const [deactivatingListing, setDeactivatingListing] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchMyListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listingApi.getMyListings();
      setListings(res.data?.listings || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
  }, []);

  const handleDeactivate = async () => {
    if (!deactivatingListing) return;
    setIsDeactivating(true);
    setError(null);

    try {
      await listingApi.deactivate(deactivatingListing.id);
      setSuccess(`Listing "${deactivatingListing.title}" successfully deactivated.`);
      setDeactivatingListing(null);
      await fetchMyListings();
    } catch (err) {
      setError(err.message || 'Failed to deactivate listing');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="seller-dashboard-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Seller Dashboard — My Listings</h1>
          <p className="page-subtitle">
            Manage your service offerings, edit details, and track performance
          </p>
        </div>
        <div className="header-actions">
          <Link to="/seller/orders" className="btn btn-outline">
            View Incoming Orders
          </Link>
          <Link to="/seller/listings/new" className="btn btn-primary">
            + Create New Listing
          </Link>
        </div>
      </header>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <Spinner message="Loading your listings..." />
      ) : listings.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📝</span>
          <h3>No Listings Created Yet</h3>
          <p>Create your first marketplace offering to start receiving orders.</p>
          <Link to="/seller/listings/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            + Create First Listing
          </Link>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title & Category</th>
                  <th>Price</th>
                  <th>Total Orders</th>
                  <th>Status</th>
                  <th>Created On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing.id}>
                    <td>
                      <Link to={`/listings/${listing.id}`} className="table-link">
                        <strong>{listing.title}</strong>
                      </Link>
                      <div className="text-muted text-sm">{listing.category}</div>
                    </td>
                    <td>
                      <strong>${Number(listing.price).toFixed(2)}</strong>
                    </td>
                    <td>
                      <span className="badge badge-pending">
                        {listing._count?.orders || 0} Orders
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={listing.status} />
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/seller/listings/${listing.id}/edit`}
                          className="btn btn-sm btn-outline"
                        >
                          Edit
                        </Link>
                        {listing.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeactivatingListing(listing)}
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deactivation Modal */}
      <Modal
        isOpen={!!deactivatingListing}
        title="Confirm Listing Deactivation"
        onClose={() => !isDeactivating && setDeactivatingListing(null)}
      >
        <div>
          <p>
            Are you sure you want to deactivate{' '}
            <strong>"{deactivatingListing?.title}"</strong>?
          </p>
          <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
            This will mark the listing as <strong>INACTIVE</strong>. It will no longer appear in the public marketplace, but all past orders will remain intact.
          </p>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setDeactivatingListing(null)}
              disabled={isDeactivating}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Listing'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

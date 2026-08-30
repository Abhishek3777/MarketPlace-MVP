import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingApi } from '../../services/listing.service.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';

export const EditListingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listingApi.getById(id);
        const l = res.data?.listing;
        if (l) {
          setTitle(l.title);
          setDescription(l.description);
          setPrice(Number(l.price).toString());
          setCategory(l.category);
        }
      } catch (err) {
        setError(err.message || 'Failed to load listing for editing');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError('Price must be a valid positive number');
      setIsSubmitting(false);
      return;
    }

    try {
      await listingApi.update(id, {
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        category: category.trim(),
      });
      navigate('/seller/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <Spinner message="Loading listing details..." />;

  return (
    <div className="form-page-container">
      <Link to="/seller/dashboard" className="back-link">
        ← Back to Seller Dashboard
      </Link>

      <div className="card form-card">
        <div className="form-header">
          <h2>Edit Listing</h2>
          <p>Update title, pricing, category, or description</p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-group">
            <label htmlFor="title">Listing Title</label>
            <input
              id="title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={255}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="Sponsored Articles">Sponsored Articles</option>
                <option value="Directory Listings">Directory Listings</option>
                <option value="Product Reviews">Product Reviews</option>
                <option value="Newsletter Ads">Newsletter Ads</option>
                <option value="Backlinks">Backlinks</option>
                <option value="Banner Ads">Banner Ads</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (USD $)</label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description & Deliverables</label>
            <textarea
              id="description"
              rows={5}
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>

          <div className="form-actions">
            <Link to="/seller/dashboard" className="btn btn-outline">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

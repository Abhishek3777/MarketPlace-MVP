import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listingApi } from '../../services/listing.service.js';
import { Spinner } from '../../components/common/Spinner.jsx';
import { Alert } from '../../components/common/Alert.jsx';

const CATEGORIES = [
  'All',
  'Sponsored Articles',
  'Directory Listings',
  'Product Reviews',
  'Newsletter Ads',
  'Backlinks',
];

export const MarketplacePage = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await listingApi.getAllActive(params);
      setListings(res.data?.listings || []);
    } catch (err) {
      setError(err.message || 'Failed to load marketplace listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="marketplace-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Marketplace Listings</h1>
          <p className="page-subtitle">
            Browse verified publisher placements, sponsored reviews, and advertising opportunities
          </p>
        </div>
      </header>

      {/* Filter & Search Bar */}
      <div className="filter-search-container card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search listings by keyword or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        <div className="category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <Spinner message="Loading marketplace opportunities..." />
      ) : listings.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📦</span>
          <h3>No Listings Found</h3>
          <p>
            {selectedCategory !== 'All' || searchQuery
              ? 'Try adjusting your filters or search query.'
              : 'There are currently no active listings available.'}
          </p>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((listing) => (
            <div key={listing.id} className="card listing-card">
              <div className="listing-card-header">
                <span className="listing-category-badge">{listing.category}</span>
                <span className="listing-price">${Number(listing.price).toFixed(2)}</span>
              </div>

              <h3 className="listing-card-title">{listing.title}</h3>
              <p className="listing-card-desc">{listing.description}</p>

              <div className="listing-card-footer">
                <div className="seller-mini-info">
                  <span className="seller-avatar">💼</span>
                  <span className="seller-name">{listing.seller?.name || 'Verified Seller'}</span>
                </div>

                <Link
                  to={`/listings/${listing.id}`}
                  className="btn btn-sm btn-primary"
                >
                  View Details & Order →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import { ApiError } from './api-error.js';
import { UserRole } from '../constants/roles.js';

/**
 * Ensures the authenticated seller owns the target listing.
 * Throws 403 Forbidden if not the owner.
 */
export const assertListingOwnership = (listing, sellerId) => {
  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  if (listing.sellerId !== sellerId) {
    throw ApiError.forbidden('You do not have permission to modify or deactivate this listing');
  }
};

/**
 * Ensures the user has permission to view the order.
 * - ADMIN: universal access.
 * - BUYER: only their own placed orders (buyerId === user.id).
 * - SELLER: only orders for their own listings (sellerId === user.id).
 */
export const assertOrderAccess = (order, user) => {
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (user.role === UserRole.ADMIN) {
    return;
  }

  const isBuyerOwner = user.role === UserRole.BUYER && order.buyerId === user.id;
  const isSellerOwner = user.role === UserRole.SELLER && order.sellerId === user.id;

  if (!isBuyerOwner && !isSellerOwner) {
    throw ApiError.forbidden('You do not have permission to view or access this order');
  }
};

/**
 * Ensures the seller is the authorized recipient/fulfiller of the order.
 */
export const assertSellerOrderOwnership = (order, sellerId) => {
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  if (order.sellerId !== sellerId) {
    throw ApiError.forbidden('You can only perform actions on orders associated with your own listings');
  }
};

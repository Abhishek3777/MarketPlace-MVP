import * as listingService from '../services/listing.service.js';
import { ApiResponse } from '../utils/api-response.js';

export const create = async (req, res, next) => {
  try {
    const { title, description, price, category } = req.body;
    const listing = await listingService.createListing(req.user.id, {
      title,
      description,
      price,
      category,
    });
    return ApiResponse.created(res, { listing }, 'Listing created successfully');
  } catch (error) {
    next(error);
  }
};

export const getAllActive = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    const listings = await listingService.getActiveListings({ category, search });
    return ApiResponse.success(res, { listings }, 'Active listings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const listing = await listingService.getListingById(id);
    return ApiResponse.success(res, { listing }, 'Listing details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const listings = await listingService.getSellerListings(req.user.id);
    return ApiResponse.success(res, { listings }, 'Seller listings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await listingService.updateListing(id, req.user.id, req.body);
    return ApiResponse.success(res, { listing: updated }, 'Listing updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deactivate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deactivated = await listingService.deactivateListing(id, req.user.id);
    return ApiResponse.success(
      res,
      { listing: deactivated },
      'Listing deactivated successfully (status set to INACTIVE)'
    );
  } catch (error) {
    next(error);
  }
};

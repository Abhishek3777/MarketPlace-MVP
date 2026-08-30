import { Router } from 'express';
import * as listingController from '../controllers/listing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UserRole } from '../constants/roles.js';
import {
  createListingSchema,
  updateListingSchema,
  listingIdParamSchema,
} from '../validators/listing.validator.js';

const router = Router();

// Public / Buyer browsing of ACTIVE listings
router.get('/', listingController.getAllActive);

// Seller dashboard: get own listings (both ACTIVE and INACTIVE)
router.get(
  '/seller/my',
  authenticate,
  authorize(UserRole.SELLER),
  listingController.getMyListings
);

// Get single listing details
router.get(
  '/:id',
  validate(listingIdParamSchema),
  listingController.getById
);

// Seller create new listing
router.post(
  '/',
  authenticate,
  authorize(UserRole.SELLER),
  validate(createListingSchema),
  listingController.create
);

// Seller edit own listing
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.SELLER),
  validate(updateListingSchema),
  listingController.update
);

// Seller soft-deactivate own listing (status: ACTIVE -> INACTIVE)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.SELLER),
  validate(listingIdParamSchema),
  listingController.deactivate
);

export default router;

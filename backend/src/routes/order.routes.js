import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UserRole } from '../constants/roles.js';
import { createOrderSchema, orderIdParamSchema } from '../validators/order.validator.js';

const router = Router();

// Place a new order (Buyer only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.BUYER),
  validate(createOrderSchema),
  orderController.create
);

// Get user orders (Buyer sees placed orders; Seller sees incoming orders)
router.get(
  '/',
  authenticate,
  authorize(UserRole.BUYER, UserRole.SELLER),
  orderController.getOrders
);

// Get single order details (Buyer who placed, Seller who received, or Admin)
router.get(
  '/:id',
  authenticate,
  validate(orderIdParamSchema),
  orderController.getById
);

// Complete an approved order (Seller only, verified listing owner)
router.patch(
  '/:id/complete',
  authenticate,
  authorize(UserRole.SELLER),
  validate(orderIdParamSchema),
  orderController.complete
);

export default router;

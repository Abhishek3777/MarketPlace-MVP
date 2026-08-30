import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { UserRole } from '../constants/roles.js';
import { orderIdParamSchema } from '../validators/order.validator.js';

const router = Router();

// Enforce Admin Authentication & Authorization on all admin routes
router.use(authenticate, authorize(UserRole.ADMIN));

// List marketplace orders with optional status filter (?status=PENDING)
router.get('/orders', adminController.getOrders);

// Approve a PENDING order -> APPROVED
router.patch(
  '/orders/:id/approve',
  validate(orderIdParamSchema),
  adminController.approve
);

// Reject a PENDING order -> REJECTED
router.patch(
  '/orders/:id/reject',
  validate(orderIdParamSchema),
  adminController.reject
);

export default router;

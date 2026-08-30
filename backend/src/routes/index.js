import { Router } from 'express';
import authRoutes from './auth.routes.js';
import listingRoutes from './listing.routes.js';
import orderRoutes from './order.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/listings', listingRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

export default router;


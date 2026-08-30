import * as adminService from '../services/admin.service.js';
import { ApiResponse } from '../utils/api-response.js';

export const getOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const orders = await adminService.getMarketplaceOrders({ status });
    return ApiResponse.success(res, { orders }, 'Marketplace orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await adminService.approveOrder(id);
    return ApiResponse.success(res, { order }, 'Order approved successfully. Status updated to APPROVED.');
  } catch (error) {
    next(error);
  }
};

export const reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await adminService.rejectOrder(id);
    return ApiResponse.success(res, { order }, 'Order rejected successfully. Status updated to REJECTED.');
  } catch (error) {
    next(error);
  }
};

import * as orderService from '../services/order.service.js';
import { ApiResponse } from '../utils/api-response.js';

export const create = async (req, res, next) => {
  try {
    const { listingId } = req.body;
    const order = await orderService.createOrder(req.user.id, { listingId });
    return ApiResponse.created(res, { order }, 'Order placed successfully. Initial status is PENDING.');
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getUserOrders(req.user);
    return ApiResponse.success(res, { orders }, 'Orders retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id, req.user);
    return ApiResponse.success(res, { order }, 'Order details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const complete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await orderService.completeOrder(id, req.user.id);
    return ApiResponse.success(res, { order }, 'Order marked as COMPLETED successfully.');
  } catch (error) {
    next(error);
  }
};


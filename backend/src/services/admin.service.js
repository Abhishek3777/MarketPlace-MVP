import { prisma } from '../config/prisma.js';
import { OrderStatus } from '../constants/roles.js';
import { ApiError } from '../utils/api-error.js';

export const getMarketplaceOrders = async ({ status } = {}) => {
  const where = {};

  if (status) {
    if (!Object.values(OrderStatus).includes(status)) {
      throw ApiError.badRequest(`Invalid status filter: ${status}. Valid options: ${Object.values(OrderStatus).join(', ')}`);
    }
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders;
};

export const approveOrder = async (orderId) => {
  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw ApiError.notFound('Order not found');
  }

  // Atomic conditional transition: Only PENDING -> APPROVED
  const updateResult = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.PENDING,
    },
    data: {
      status: OrderStatus.APPROVED,
    },
  });

  if (updateResult.count === 0) {
    throw ApiError.conflict(
      `Cannot approve order. Order is currently in '${existingOrder.status}' state. Only PENDING orders can be approved.`
    );
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  return updatedOrder;
};

export const rejectOrder = async (orderId) => {
  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw ApiError.notFound('Order not found');
  }

  // Atomic conditional transition: Only PENDING -> REJECTED
  const updateResult = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.PENDING,
    },
    data: {
      status: OrderStatus.REJECTED,
    },
  });

  if (updateResult.count === 0) {
    throw ApiError.conflict(
      `Cannot reject order. Order is currently in '${existingOrder.status}' state. Only PENDING orders can be rejected.`
    );
  }

  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  return updatedOrder;
};

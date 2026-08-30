import { prisma } from '../config/prisma.js';
import { ListingStatus, OrderStatus, UserRole } from '../constants/roles.js';
import { ApiError } from '../utils/api-error.js';
import { assertOrderAccess } from '../utils/ownership.js';

export const createOrder = async (buyerId, { listingId }) => {
  // 1. Fetch authoritative listing from database
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!listing) {
    throw ApiError.notFound('Listing not found');
  }

  // 2. Verify listing is ACTIVE
  if (listing.status !== ListingStatus.ACTIVE) {
    throw ApiError.badRequest('Cannot place an order on an inactive listing');
  }

  // 3. Prevent self-dealing (Seller ordering own listing)
  if (listing.sellerId === buyerId) {
    throw ApiError.badRequest('Sellers cannot purchase their own listings');
  }

  // 4. Freeze price snapshot from authoritative database listing record
  const snapshotAmount = listing.price;

  // 5. Create PENDING order
  const order = await prisma.order.create({
    data: {
      buyerId,
      sellerId: listing.sellerId,
      listingId: listing.id,
      amount: snapshotAmount,
      status: OrderStatus.PENDING,
    },
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
  });

  return order;
};

export const getUserOrders = async (user) => {
  const where = {};

  if (user.role === UserRole.BUYER) {
    where.buyerId = user.id;
  } else if (user.role === UserRole.SELLER) {
    where.sellerId = user.id;
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

export const getOrderById = async (orderId, user) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
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
  });

  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Enforce ownership access (Buyer who placed it, Seller who received it, or Admin)
  assertOrderAccess(order, user);

  return order;
};

export const completeOrder = async (orderId, sellerId) => {
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw ApiError.notFound('Order not found');
  }

  // Ensure only the seller who owns the listing for this order can complete it
  if (existingOrder.sellerId !== sellerId) {
    throw ApiError.forbidden('You can only complete orders associated with your own listings');
  }

  // Atomic conditional transition: Only APPROVED -> COMPLETED
  const updateResult = await prisma.order.updateMany({
    where: {
      id: orderId,
      sellerId,
      status: OrderStatus.APPROVED,
    },
    data: {
      status: OrderStatus.COMPLETED,
    },
  });

  if (updateResult.count === 0) {
    throw ApiError.conflict(
      `Cannot complete order. Order is currently in '${existingOrder.status}' state. Only APPROVED orders can be marked as COMPLETED.`
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


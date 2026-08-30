import { prisma } from '../config/prisma.js';
import { ListingStatus } from '../constants/roles.js';
import { ApiError } from '../utils/api-error.js';
import { assertListingOwnership } from '../utils/ownership.js';

export const createListing = async (sellerId, { title, description, price, category }) => {
  const listing = await prisma.listing.create({
    data: {
      sellerId,
      title,
      description,
      price,
      category,
      status: ListingStatus.ACTIVE,
    },
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

  return listing;
};

export const getActiveListings = async ({ category, search } = {}) => {
  const where = {
    status: ListingStatus.ACTIVE,
  };

  if (category) {
    where.category = {
      equals: category,
      mode: 'insensitive',
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const listings = await prisma.listing.findMany({
    where,
    include: {
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

  return listings;
};

export const getListingById = async (id) => {
  const listing = await prisma.listing.findUnique({
    where: { id },
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

  return listing;
};

export const getSellerListings = async (sellerId) => {
  const listings = await prisma.listing.findMany({
    where: { sellerId },
    include: {
      _count: {
        select: { orders: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return listings;
};

export const updateListing = async (id, sellerId, updateData) => {
  const existingListing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!existingListing) {
    throw ApiError.notFound('Listing not found');
  }

  assertListingOwnership(existingListing, sellerId);

  const updated = await prisma.listing.update({
    where: { id },
    data: updateData,
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

  return updated;
};

export const deactivateListing = async (id, sellerId) => {
  const existingListing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!existingListing) {
    throw ApiError.notFound('Listing not found');
  }

  assertListingOwnership(existingListing, sellerId);

  const deactivated = await prisma.listing.update({
    where: { id },
    data: { status: ListingStatus.INACTIVE },
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

  return deactivated;
};

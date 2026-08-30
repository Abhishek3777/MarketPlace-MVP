import { z } from 'zod';

export const createOrderSchema = z.object({
  body: z.object({
    listingId: z.string({ required_error: 'Listing ID is required' }).uuid('Invalid listing ID format'),
  }),
});

export const orderIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid order ID format'),
  }),
});

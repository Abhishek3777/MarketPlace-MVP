import { z } from 'zod';

export const createListingSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be at least 3 characters')
      .max(255, 'Title cannot exceed 255 characters'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters'),
    price: z
      .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a valid number' })
      .positive('Price must be greater than 0')
      .max(1000000, 'Price cannot exceed 1,000,000')
      .refine((val) => Number(val.toFixed(2)) === val, {
        message: 'Price cannot have more than 2 decimal places',
      }),
    category: z
      .string({ required_error: 'Category is required' })
      .trim()
      .min(2, 'Category must be at least 2 characters')
      .max(100, 'Category cannot exceed 100 characters'),
  }),
});

export const updateListingSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID format'),
  }),
  body: z
    .object({
      title: z.string().trim().min(3).max(255).optional(),
      description: z.string().trim().min(10).optional(),
      price: z
        .number()
        .positive('Price must be greater than 0')
        .max(1000000)
        .refine((val) => Number(val.toFixed(2)) === val, {
          message: 'Price cannot have more than 2 decimal places',
        })
        .optional(),
      category: z.string().trim().min(2).max(100).optional(),
      status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const listingIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid listing ID format'),
  }),
});

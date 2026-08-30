import { ApiError } from '../utils/api-error.js';

export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.errors) {
      const details = error.errors.map((err) => ({
        field: err.path.slice(1).join('.'),
        message: err.message,
      }));
      const primaryMessage = details[0]?.message || 'Input validation failed';
      return next(ApiError.badRequest(primaryMessage, details));
    }
    next(error);
  }
};

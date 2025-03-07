import rateLimit from 'express-rate-limit';

export const createEndpointLimiter = (windowMinutes: number = 15, maxRequests: number = 30) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: {
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}; 
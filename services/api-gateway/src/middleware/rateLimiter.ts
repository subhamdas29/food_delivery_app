import {rateLimit} from 'express-rate-limit';

// Global limiter — applies to all routes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
  },
});

// Stricter limiter for order placement specifically
// Prevents a single user from spamming orders
export const orderLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // 5 orders per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many orders placed, please wait before trying again',
  },
});
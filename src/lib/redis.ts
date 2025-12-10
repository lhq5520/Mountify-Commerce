import { Redis } from '@upstash/redis';

// Initialize Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes (organized naming)
export const CACHE_KEYS = {
  PRODUCTS_ALL: 'products:all',
  PRODUCT_BY_ID: (id: number) => `product:${id}`,
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  PRODUCTS: 60 * 10,  // 10 minutes
  PRODUCT: 60 * 30,   // 30 minutes
};
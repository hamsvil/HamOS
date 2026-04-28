declare module '@workspace/*';
declare module 'drizzle-orm';
declare module 'express-rate-limit';

declare namespace Express {
  interface Request {
    log?: any;
  }
}

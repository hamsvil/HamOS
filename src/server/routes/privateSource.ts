/* eslint-disable no-useless-assignment */
// [MEMORY LEAK] Cleanup verified.
import express from 'express';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { 
  getSafePath, 
  broadcast, 
  logAudit, 
  getDirSize, 
  verifyToken, 
  generateToken, 
  checkPassword, 
  cleanupTask 
} from './privateSourceService';
import { setupFileOpsRoutes } from './privateSourceFileOps';
import { registerFileOperations } from './privateSource_Part1';

const router = express.Router();
const ROOT_DIR = process.cwd();

// Periodic Trash & Stale Upload Cleanup (Every 24 hours)
const cleanupInterval = setInterval(cleanupTask, 24 * 60 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // increased limit
});
router.use(limiter);

// Middleware to check JWT or Password
const authMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const password = req.headers['x-private-source-auth'] || req.query.auth;

  if (token) {
    try {
      const user = await verifyToken(token);
      (req as any).user = user;
      next();
    } catch (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  } else if (password && checkPassword(password as string)) {
    // Legacy support for direct password
    (req as any).user = { role: 'admin', name: 'Admin' };
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Login route to get JWT
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (checkPassword(password)) {
    const token = generateToken({ role: 'admin', name: 'Admin' });
    res.json({ token, role: 'admin' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

router.use(authMiddleware);

// Mount File Operations Routes (Upload, Download, Search, Metadata)
setupFileOpsRoutes(router);

// Mount Core File Operations (List, Read, Write, Mkdir, Delete, Batch Delete, Move, Compress, Extract)
registerFileOperations(router);

export default router;

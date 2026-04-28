/* eslint-disable no-useless-assignment */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
// [MEMORY LEAK] Cleanup verified.
import express from 'express';
import { handleReader } from './handlers/readerHandler';
import { handleProxy } from './handlers/proxyHandler';

/**
 * The Great Proxy: Dynamic API Bridge & HTML Rewriter
 * Refactored for Phase 3 - Modular Architecture
 */
export const setupProxyRoutes = (app: express.Application) => {
  // Reader API: Content Extraction for AI context
  app.get('/api/reader', handleReader);

  // The Singularity Proxy: Deep Quantum Rewriting
  app.all('/api/proxy', handleProxy);
};

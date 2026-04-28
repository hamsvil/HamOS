import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger';

const router = express.Router();
const STATE_FILE = path.join(process.cwd(), 'data/global-state.json');

// Auth Middleware (Reused from lisa.ts logic)
async function authenticateLisa(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    const secretsPath = path.join(process.cwd(), '.hamli-secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));

    if (token !== secrets.lisa_token) {
      return res.status(403).json({ error: 'Forbidden: Invalid token' });
    }

    next();
  } catch (error) {
    (logger as any).error({ err: error }, 'State Auth Error');
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      const initialState = { conversations: {}, settings: {}, ui: {}, meta: { lastSaved: null, version: 1 } };
      fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2));
      return initialState;
    }
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (error) {
    (logger as any).error({ err: error }, 'Error reading state file');
    return { conversations: {}, settings: {}, ui: {}, meta: { lastSaved: null, version: 1 } };
  }
}

function writeState(state: any) {
  try {
    state.meta.lastSaved = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (error) {
    (logger as any).error({ err: error }, 'Error writing state file');
    return false;
  }
}

// GET /api/state/load?scope=
router.get('/load', authenticateLisa, (req, res) => {
  const scope = req.query.scope as string;
  const state = readState();

  if (!scope || scope === 'all') {
    return res.json(state);
  }

  const validScopes = ['conversations', 'settings', 'ui', 'meta'];
  if (validScopes.includes(scope)) {
    return res.json({ [scope]: state[scope] });
  }

  res.status(400).json({ error: 'Invalid scope' });
});

// POST /api/state/save
router.post('/save', authenticateLisa, (req, res) => {
  const { scope, key, value } = req.body;

  if (!scope || !key || value === undefined) {
    return res.status(400).json({ error: 'Missing scope, key, or value' });
  }

  if (!['conversations', 'settings', 'ui'].includes(scope)) {
    return res.status(400).json({ error: 'Invalid scope for saving' });
  }

  const state = readState();
  if (!state[scope]) state[scope] = {};
  state[scope][key] = value;

  if (writeState(state)) {
    res.json({ success: true, scope, key });
  } else {
    res.status(500).json({ error: 'Failed to save state' });
  }
});

// DELETE /api/state/clear
router.delete('/clear', authenticateLisa, (req, res) => {
  const { scope } = req.body;
  const state = readState();

  if (!scope || scope === 'all') {
    state.conversations = {};
    state.settings = {};
    state.ui = {};
  } else if (['conversations', 'settings', 'ui'].includes(scope)) {
    state[scope] = {};
  } else {
    return res.status(400).json({ error: 'Invalid scope for clearing' });
  }

  if (writeState(state)) {
    res.json({ success: true, cleared: scope || 'all' });
  } else {
    res.status(500).json({ error: 'Failed to clear state' });
  }
});

export const stateRouter = router;

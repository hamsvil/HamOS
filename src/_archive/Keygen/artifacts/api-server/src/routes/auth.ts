import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, verifyPassword, hashPassword, getClientIp, getUserFromSession } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const router = Router();

// In-memory login lockout: 5 failed attempts per IP within 15 min → 15-min lockout.
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const FAIL_LIMIT = 5;
const failures = new Map<string, { count: number; firstAt: number; lockedUntil?: number }>();

function isLockedOut(ip: string): number {
  const rec = failures.get(ip);
  if (!rec) return 0;
  const now = Date.now();
  if (rec.lockedUntil && rec.lockedUntil > now) return rec.lockedUntil - now;
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    failures.delete(ip);
    return 0;
  }
  if (now - rec.firstAt > FAIL_WINDOW_MS) {
    failures.delete(ip);
    return 0;
  }
  return 0;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const rec = failures.get(ip);
  if (!rec || now - rec.firstAt > FAIL_WINDOW_MS) {
    failures.set(ip, { count: 1, firstAt: now });
    return;
  }
  rec.count += 1;
  if (rec.count >= FAIL_LIMIT) {
    rec.lockedUntil = now + FAIL_WINDOW_MS;
  }
}

function clearFailure(ip: string) {
  failures.delete(ip);
}

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await getUserFromSession(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
});

router.post("/login", async (req, res) => {
  const ip = getClientIp(req);
  const lockedFor = isLockedOut(ip);
  if (lockedFor > 0) {
    return res.status(429).json({ error: `Too many failed attempts. Try again in ${Math.ceil(lockedFor / 1000)}s.` });
  }

  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) return res.status(400).json({ error: "username and password required" });

  const rows = await db.select().from(usersTable).where(eq(usersTable.username, username.toLowerCase().trim())).limit(1);
  const user = rows[0];

  if (!user) {
    recordFailure(ip);
    await new Promise((r) => setTimeout(r, 300));
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordFailure(ip);
    await writeAuditLog({ userId: user.id, action: "login_failed", entityType: "user", entityId: user.id, ipAddress: ip, userAgent: req.headers["user-agent"] });
    await new Promise((r) => setTimeout(r, 300));
    return res.status(401).json({ error: "Invalid credentials" });
  }

  clearFailure(ip);
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  await writeAuditLog({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"],
  });

  res.json({ id: user.id, username: user.username, displayName: user.displayName, role: user.role });
});

router.post("/logout", requireAuth, async (req, res) => {
  const userId = req.session.userId;
  await writeAuditLog({ userId, action: "logout", entityType: "user", entityId: userId, ipAddress: getClientIp(req) });
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.post("/change-password", requireAuth, changePasswordLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "currentPassword and newPassword required" });
  if (newPassword.length < 10) return res.status(400).json({ error: "Password must be at least 10 characters" });
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: "Password must contain upper, lower, and digit" });
  }

  const user = await getUserFromSession(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password incorrect" });

  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  await writeAuditLog({ userId: user.id, action: "password_changed", entityType: "user", entityId: user.id, ipAddress: getClientIp(req) });
  res.json({ ok: true });
});

router.get("/session", requireAuth, async (req, res) => {
  const user = await getUserFromSession(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({
    userId: user.id,
    username: user.username,
    role: user.role,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] ?? "unknown",
    cookieMaxAge: req.session.cookie.maxAge,
    expiresAt: req.session.cookie.expires?.toISOString() ?? null,
  });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, hashPassword, getClientIp, getUserFromSession } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";

const router = Router();
router.use(requireAuth);

async function requireAdmin(req: any, res: any, next: any) {
  const u = await getUserFromSession(req);
  if (!u || u.role !== "admin") return res.status(403).json({ error: "Forbidden (admin only)" });
  next();
}

router.get("/users", requireAdmin, async (_req, res) => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(sql`${usersTable.id} ASC`);
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/users", requireAdmin, async (req, res) => {
  const { username, displayName, password, role } = req.body as {
    username?: string; displayName?: string; password?: string; role?: string;
  };
  if (!username || !displayName || !password) {
    return res.status(400).json({ error: "username, displayName, password required" });
  }
  if (password.length < 10) return res.status(400).json({ error: "Password must be ≥10 chars" });
  const safeRole = role === "admin" || role === "viewer" ? role : "user";
  const passwordHash = await hashPassword(password);
  try {
    const inserted = await db
      .insert(usersTable)
      .values({ username: username.toLowerCase().trim(), displayName, passwordHash, role: safeRole })
      .returning({ id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName, role: usersTable.role });
    await writeAuditLog({
      userId: req.session.userId, action: "user_created",
      entityType: "user", entityId: inserted[0].id, ipAddress: getClientIp(req),
    });
    res.json(inserted[0]);
  } catch (e: any) {
    if (String(e?.message ?? "").includes("duplicate")) {
      return res.status(409).json({ error: "Username already exists" });
    }
    throw e;
  }
});

router.patch("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
  const { displayName, role, password } = req.body as { displayName?: string; role?: string; password?: string };
  const update: Record<string, unknown> = {};
  if (displayName) update.displayName = displayName;
  if (role && (role === "admin" || role === "user" || role === "viewer")) update.role = role;
  if (password) {
    if (password.length < 10) return res.status(400).json({ error: "Password must be ≥10 chars" });
    update.passwordHash = await hashPassword(password);
  }
  if (Object.keys(update).length === 0) return res.status(400).json({ error: "no fields to update" });
  await db.update(usersTable).set(update).where(eq(usersTable.id, id));
  await writeAuditLog({
    userId: req.session.userId, action: "user_updated",
    entityType: "user", entityId: id, ipAddress: getClientIp(req),
  });
  res.json({ ok: true });
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
  if (id === req.session.userId) return res.status(400).json({ error: "Cannot delete your own account" });
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await writeAuditLog({
    userId: req.session.userId, action: "user_deleted",
    entityType: "user", entityId: id, ipAddress: getClientIp(req),
  });
  res.json({ ok: true });
});

router.post("/prune", requireAdmin, async (req, res) => {
  const body = (req.body ?? {}) as { validationDays?: number; auditDays?: number };
  const vDays = Math.min(3650, Math.max(7, body.validationDays ?? 90));
  const aDays = Math.min(3650, Math.max(30, body.auditDays ?? 365));
  const vCutoff = new Date(Date.now() - vDays * 86400000);
  const aCutoff = new Date(Date.now() - aDays * 86400000);

  const { validationHistoryTable, auditLogsTable } = await import("@workspace/db");
  const { lt } = await import("drizzle-orm");

  const vRes: any = await db.delete(validationHistoryTable).where(lt(validationHistoryTable.validatedAt, vCutoff));
  const aRes: any = await db.delete(auditLogsTable).where(lt(auditLogsTable.createdAt, aCutoff));

  await writeAuditLog({
    userId: req.session.userId, action: "system_prune", entityType: "system",
    details: { validationDays: vDays, auditDays: aDays },
    ipAddress: getClientIp(req),
  });

  res.json({
    validationDeleted: vRes?.rowCount ?? null,
    auditDeleted: aRes?.rowCount ?? null,
    validationDays: vDays,
    auditDays: aDays,
  });
});

export default router;

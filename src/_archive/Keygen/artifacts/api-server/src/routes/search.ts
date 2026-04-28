import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable, validationHistoryTable, auditLogsTable } from "@workspace/db";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.session.userId!;
  const { q } = req.query as { q?: string };
  if (!q || q.length < 2) return res.json({ keys: [], history: [], audit: [] });

  const pattern = `%${q}%`;

  const keys = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, userId), or(ilike(apiKeysTable.name, pattern), ilike(apiKeysTable.provider, pattern), ilike(apiKeysTable.keyPrefix, pattern))))
    .limit(20);

  const history = await db.select().from(validationHistoryTable)
    .where(or(ilike(validationHistoryTable.provider, pattern), ilike(validationHistoryTable.keyPrefix, pattern)))
    .orderBy(sql`${validationHistoryTable.validatedAt} DESC`).limit(10);

  const audit = await db.select().from(auditLogsTable)
    .where(and(eq(auditLogsTable.userId, userId), ilike(auditLogsTable.action, pattern)))
    .orderBy(sql`${auditLogsTable.createdAt} DESC`).limit(10);

  res.json({
    keys: keys.map((k) => ({ ...k, keyHash: undefined, expiresAt: k.expiresAt?.toISOString() ?? null, tags: [], createdAt: k.createdAt.toISOString(), updatedAt: k.updatedAt.toISOString() })),
    history: history.map((h) => ({ ...h, validatedAt: h.validatedAt.toISOString() })),
    audit: audit.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

export default router;

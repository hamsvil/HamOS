import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { action, startDate, endDate, page = "1", limit = "50" } = req.query as Record<string, string>;
  const userId = req.session.userId!;
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;

  const conditions = [eq(auditLogsTable.userId, userId)];
  if (action) conditions.push(eq(auditLogsTable.action, action));
  if (startDate) conditions.push(gte(auditLogsTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(auditLogsTable.createdAt, new Date(endDate)));

  const rows = await db.select().from(auditLogsTable)
    .where(and(...conditions))
    .orderBy(sql`${auditLogsTable.createdAt} DESC`)
    .offset(offset).limit(lim);

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(auditLogsTable).where(and(...conditions));

  res.json({
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: Number(countResult[0].count), page: pg, limit: lim,
  });
});

export default router;

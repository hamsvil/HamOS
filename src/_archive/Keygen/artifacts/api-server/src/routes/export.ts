import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable, keyTagsTable, validationHistoryTable, auditLogsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/keys", async (req, res) => {
  const userId = req.session.userId!;
  const { format = "json" } = req.query as { format?: string };

  const rows = await db.select().from(apiKeysTable).where(eq(apiKeysTable.userId, userId));
  const tags = await db.select().from(keyTagsTable);
  const tagsByKey: Record<number, string[]> = {};
  for (const t of tags) {
    if (!tagsByKey[t.keyId]) tagsByKey[t.keyId] = [];
    tagsByKey[t.keyId].push(t.tag);
  }

  const data = rows.map((k) => ({
    id: k.id, name: k.name, provider: k.provider, keyPrefix: k.keyPrefix,
    status: k.status, tags: (tagsByKey[k.id] ?? []).join(";"),
    createdAt: k.createdAt.toISOString(), expiresAt: k.expiresAt?.toISOString() ?? "",
  }));

  if (format === "csv") {
    const headers = ["id", "name", "provider", "keyPrefix", "status", "tags", "createdAt", "expiresAt"];
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=keys.csv");
    return res.send(csv);
  }

  res.setHeader("Content-Disposition", "attachment; filename=keys.json");
  res.json(data);
});

router.get("/history", async (req, res) => {
  const { format = "json" } = req.query as { format?: string };
  const rows = await db.select().from(validationHistoryTable).orderBy(sql`${validationHistoryTable.validatedAt} DESC`).limit(10000);
  const data = rows.map((r) => ({ ...r, validatedAt: r.validatedAt.toISOString() }));

  if (format === "csv") {
    const headers = ["id", "provider", "keyPrefix", "status", "responseTime", "errorMessage", "validatedAt"];
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=history.csv");
    return res.send(csv);
  }

  res.setHeader("Content-Disposition", "attachment; filename=history.json");
  res.json(data);
});

router.get("/audit", async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db.select().from(auditLogsTable).where(eq(auditLogsTable.userId, userId)).orderBy(sql`${auditLogsTable.createdAt} DESC`).limit(10000);
  const headers = ["id", "action", "entityType", "entityId", "ipAddress", "createdAt"];
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=audit.csv");
  res.send(csv);
});

export default router;

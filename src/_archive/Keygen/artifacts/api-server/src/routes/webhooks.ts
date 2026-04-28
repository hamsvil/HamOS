import { Router } from "express";
import { db } from "@workspace/db";
import { webhookLogsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import fetch from "node-fetch";
import crypto from "crypto";
import { isSsrfBlocked } from "../lib/providers.js";

const router = Router();
router.use(requireAuth);

const WEBHOOK_SECRET = process.env.SESSION_SECRET ?? "webhook-secret";

router.post("/test", async (req, res) => {
  const { url, method = "POST", payload = {} } = req.body as { url: string; method?: string; payload?: Record<string, unknown> };

  if (!url) return res.status(400).json({ error: "url required" });
  if (isSsrfBlocked(url)) return res.status(400).json({ error: "URL not allowed (SSRF protection)" });

  const body = JSON.stringify(payload);
  const hmacSignature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");

  const start = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "X-HamKeyGen-Signature": hmacSignature },
      body,
      signal: controller.signal as import("node-fetch").RequestInit["signal"],
    });
    responseStatus = response.status;
    responseBody = await response.text().catch(() => null);
    success = response.ok;
  } catch (err) {
    responseBody = err instanceof Error ? err.message : "Network error";
  }

  const durationMs = Date.now() - start;

  await db.insert(webhookLogsTable).values({
    url, method, payload, hmacSignature, responseStatus, responseBody, durationMs,
  });

  res.json({ success, statusCode: responseStatus, responseBody, durationMs, hmacSignature });
});

router.get("/logs", async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;

  const rows = await db.select().from(webhookLogsTable)
    .orderBy(sql`${webhookLogsTable.createdAt} DESC`)
    .offset(offset).limit(lim);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(webhookLogsTable);

  res.json({
    data: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: Number(countResult[0].count), page: pg, limit: lim,
  });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth, getUserFromSession } from "../lib/auth.js";

const router = Router();
const startedAt = Date.now();

router.get("/info", requireAuth, async (req, res) => {
  const me = await getUserFromSession(req);
  const isAdmin = me?.role === "admin";

  let dbStatus: "ok" | "down" = "ok";
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatency = Date.now() - t0;
  } catch {
    dbStatus = "down";
  }

  const mem = process.memoryUsage();
  res.json({
    name: "Ham Key Gen API",
    nodeVersion: process.version,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    db: { status: dbStatus, latencyMs: dbLatency },
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    },
    nodeEnv: process.env.NODE_ENV ?? "development",
    // Detail OS hanya untuk admin
    ...(isAdmin
      ? { platform: process.platform, arch: process.arch, pid: process.pid }
      : {}),
  });
});

router.get("/metrics", requireAuth, async (_req, res) => {
  const mem = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startedAt) / 1000);

  let dbUp = 1;
  let dbLatency = 0;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatency = Date.now() - t0;
  } catch {
    dbUp = 0;
  }

  let keyCount = 0, validationCount = 0, auditCount = 0;
  try {
    const r = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM api_keys WHERE is_archived = false)::int AS keys,
        (SELECT COUNT(*) FROM validation_history)::int AS validations,
        (SELECT COUNT(*) FROM audit_logs)::int AS audits
    `);
    const row = (r.rows?.[0] ?? {}) as Record<string, number>;
    keyCount = Number(row.keys ?? 0);
    validationCount = Number(row.validations ?? 0);
    auditCount = Number(row.audits ?? 0);
  } catch {}

  const lines = [
    "# HELP hamkeygen_up 1 if API process is up",
    "# TYPE hamkeygen_up gauge",
    "hamkeygen_up 1",
    "# HELP hamkeygen_db_up 1 if database is reachable",
    "# TYPE hamkeygen_db_up gauge",
    `hamkeygen_db_up ${dbUp}`,
    "# HELP hamkeygen_db_latency_ms Latency of SELECT 1 against the DB",
    "# TYPE hamkeygen_db_latency_ms gauge",
    `hamkeygen_db_latency_ms ${dbLatency}`,
    "# HELP hamkeygen_uptime_seconds Process uptime in seconds",
    "# TYPE hamkeygen_uptime_seconds counter",
    `hamkeygen_uptime_seconds ${uptime}`,
    "# HELP hamkeygen_memory_bytes Memory usage in bytes",
    "# TYPE hamkeygen_memory_bytes gauge",
    `hamkeygen_memory_bytes{type="rss"} ${mem.rss}`,
    `hamkeygen_memory_bytes{type="heap_used"} ${mem.heapUsed}`,
    `hamkeygen_memory_bytes{type="heap_total"} ${mem.heapTotal}`,
    "# HELP hamkeygen_keys_total Total active (non-archived) API keys",
    "# TYPE hamkeygen_keys_total gauge",
    `hamkeygen_keys_total ${keyCount}`,
    "# HELP hamkeygen_validations_total Total validation history rows",
    "# TYPE hamkeygen_validations_total counter",
    `hamkeygen_validations_total ${validationCount}`,
    "# HELP hamkeygen_audit_logs_total Total audit log rows",
    "# TYPE hamkeygen_audit_logs_total counter",
    `hamkeygen_audit_logs_total ${auditCount}`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(lines);
});

export default router;

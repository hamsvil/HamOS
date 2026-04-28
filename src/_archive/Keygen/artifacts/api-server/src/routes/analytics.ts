import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable, validationHistoryTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req, res) => {
  const userId = req.session.userId!;

  const totalResult = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`count(*) filter (where ${apiKeysTable.status} = 'active')`,
    revoked: sql<number>`count(*) filter (where ${apiKeysTable.status} = 'revoked')`,
    expired: sql<number>`count(*) filter (where ${apiKeysTable.status} = 'expired')`,
  }).from(apiKeysTable).where(and(eq(apiKeysTable.userId, userId), eq(apiKeysTable.isArchived, false)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayResult = await db.select({ count: sql<number>`count(*)` })
    .from(validationHistoryTable)
    .where(gte(validationHistoryTable.validatedAt, today));

  const totalValidResult = await db.select({
    total: sql<number>`count(*)`,
    success: sql<number>`count(*) filter (where ${validationHistoryTable.status} = 'valid')`,
  }).from(validationHistoryTable);

  const t = totalResult[0];
  const totalValidations = Number(totalValidResult[0].total);
  const success = Number(totalValidResult[0].success);

  res.json({
    totalKeys: Number(t.total),
    activeKeys: Number(t.active),
    revokedKeys: Number(t.revoked),
    expiredKeys: Number(t.expired),
    validatedToday: Number(todayResult[0].count),
    successRate: totalValidations > 0 ? Math.round((success / totalValidations) * 100) / 100 : 0,
    totalValidations,
  });
});

router.get("/usage", async (req, res) => {
  const { days = "30" } = req.query as { days?: string };
  const numDays = Math.min(365, Math.max(1, parseInt(days, 10)));

  const since = new Date();
  since.setDate(since.getDate() - numDays);

  const rows = await db.execute(sql`
    SELECT 
      DATE(validated_at)::text as date,
      COUNT(*)::int as validations,
      COUNT(*) FILTER (WHERE status = 'valid')::int as success,
      COUNT(*) FILTER (WHERE status != 'valid')::int as failed
    FROM validation_history
    WHERE validated_at >= ${since}
    GROUP BY DATE(validated_at)
    ORDER BY DATE(validated_at)
  `);

  res.json(rows.rows);
});

router.get("/providers", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT 
      provider,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'valid')::int as success,
      COUNT(*) FILTER (WHERE status != 'valid')::int as failed,
      ROUND(AVG(response_time))::int as "avgResponseTime"
    FROM validation_history
    GROUP BY provider
    ORDER BY total DESC
  `);
  res.json(rows.rows);
});

router.get("/timeseries", async (req, res) => {
  const userId = req.session.userId!;
  const { days = "30" } = req.query as { days?: string };
  const numDays = Math.min(365, Math.max(1, parseInt(days, 10)));
  const since = new Date();
  since.setDate(since.getDate() - numDays);

  const created = await db.execute(sql`
    SELECT DATE(created_at)::text as date, COUNT(*)::int as keys
    FROM api_keys
    WHERE user_id = ${userId} AND created_at >= ${since}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `);

  const validations = await db.execute(sql`
    SELECT DATE(validated_at)::text as date,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'valid')::int as valid,
      COUNT(*) FILTER (WHERE status = 'invalid')::int as invalid,
      COUNT(*) FILTER (WHERE status NOT IN ('valid','invalid'))::int as other
    FROM validation_history
    WHERE validated_at >= ${since}
    GROUP BY DATE(validated_at)
    ORDER BY DATE(validated_at)
  `);

  res.json({
    keysCreated: created.rows,
    validations: validations.rows,
    sinceDays: numDays,
  });
});

router.get("/security-score", async (req, res) => {
  const userId = req.session.userId!;

  const keys = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.userId, userId), eq(apiKeysTable.isArchived, false)));

  const activeKeys = keys.filter((k) => k.status === "active");
  const keysWithExpiry = activeKeys.filter((k) => k.expiresAt !== null);
  const recentlyValidated = activeKeys.filter((k) => {
    if (!k.lastValidatedAt) return false;
    const diff = Date.now() - k.lastValidatedAt.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  });

  const factors = [
    {
      name: "Key Validation",
      points: activeKeys.length > 0 ? Math.min(30, Math.round((recentlyValidated.length / activeKeys.length) * 30)) : 0,
      maxPoints: 30,
      description: "Keys validated within last 7 days",
    },
    {
      name: "Expiry Management",
      points: activeKeys.length > 0 ? Math.min(25, Math.round((keysWithExpiry.length / activeKeys.length) * 25)) : 0,
      maxPoints: 25,
      description: "Active keys with expiry dates set",
    },
    {
      name: "No Revoked Keys",
      points: keys.filter((k) => k.status === "revoked").length === 0 ? 25 : 10,
      maxPoints: 25,
      description: "Minimal revoked/compromised keys",
    },
    {
      name: "Active Monitoring",
      points: activeKeys.length > 0 ? 20 : 0,
      maxPoints: 20,
      description: "API keys actively managed",
    },
  ];

  const score = factors.reduce((acc, f) => acc + f.points, 0);
  res.json({ score, factors });
});

export default router;

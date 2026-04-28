import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable, validationHistoryTable, providersTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { validateKeyAgainstProvider } from "../lib/providers.js";
import crypto from "crypto";

const router = Router();
router.use(requireAuth);

async function getProviderConfig(provider: string) {
  const rows = await db.select().from(providersTable).where(eq(providersTable.slug, provider)).limit(1);
  return rows[0] ?? null;
}

const validationCache = new Map<string, { result: { status: string; responseTime: number }; expiresAt: number }>();

router.post("/", async (req, res) => {
  const userId = req.session.userId!;
  const { key, provider, keyId } = req.body as { key: string; provider: string; keyId?: number | null };

  if (!key || !provider) return res.status(400).json({ error: "key and provider required" });

  const cacheKey = `${provider}:${crypto.createHash("sha256").update(key).digest("hex")}`;
  const cached = validationCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return res.json({ ...cached.result, cached: true });
  }

  const providerConfig = await getProviderConfig(provider);
  if (!providerConfig || !providerConfig.validateUrl) {
    return res.status(404).json({ error: "Provider not found or not configured" });
  }

  const result = await validateKeyAgainstProvider(key, providerConfig);
  const keyPrefix = key.length <= 8 ? key : key.slice(0, 8);

  await db.insert(validationHistoryTable).values({
    keyId: keyId ?? null,
    provider,
    keyPrefix,
    status: result.status,
    responseTime: result.responseTime,
    roundedResponseTime: Math.round(result.responseTime / 100) * 100,
    errorMessage: result.error ?? null,
    isBatch: false,
  });

  if (keyId) {
    await db.update(apiKeysTable).set({
      lastValidatedAt: new Date(),
      lastValidStatus: result.status,
      usageCount: sql`${apiKeysTable.usageCount} + 1`,
      updatedAt: new Date(),
    }).where(and(eq(apiKeysTable.id, keyId), eq(apiKeysTable.userId, userId)));
  }

  if (result.status === "invalid" || result.status === "error") {
    if (keyId) {
      await db.insert(notificationsTable).values({
        userId,
        type: "validation_failed",
        title: "Key Validation Failed",
        message: `Key validation against ${provider} returned: ${result.status}`,
        keyId,
      });
    }
  }

  if (result.status === "valid") {
    validationCache.set(cacheKey, { result: { status: result.status, responseTime: result.responseTime }, expiresAt: Date.now() + 5 * 60_000 });
  }

  res.json({ status: result.status, provider, responseTime: result.responseTime, error: result.error ?? null, cached: false });
});

router.post("/batch", async (req, res) => {
  const userId = req.session.userId!;
  const { keys, provider } = req.body as { keys: string[]; provider: string };
  if (!keys?.length || !provider) return res.status(400).json({ error: "keys and provider required" });
  if (keys.length > 50) return res.status(400).json({ error: "max 50 keys per batch" });

  const providerConfig = await getProviderConfig(provider);
  if (!providerConfig || !providerConfig.validateUrl) return res.status(404).json({ error: "Provider not found" });

  const batchId = crypto.randomUUID();
  const results = [];

  for (const key of keys) {
    const result = await validateKeyAgainstProvider(key, providerConfig);
    const keyPrefix = key.length <= 8 ? key : key.slice(0, 8);
    const keyPreview = `${keyPrefix}...`;

    await db.insert(validationHistoryTable).values({
      provider, keyPrefix, status: result.status,
      responseTime: result.responseTime,
      roundedResponseTime: Math.round(result.responseTime / 100) * 100,
      errorMessage: result.error ?? null,
      isBatch: true, batchId,
    });

    results.push({ keyPreview, status: result.status, responseTime: result.responseTime, error: result.error ?? null });
  }

  res.json({ batchId, total: keys.length, results });
});

router.get("/history", async (req, res) => {
  const { provider, status, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;

  const conditions = [];
  if (provider) conditions.push(eq(validationHistoryTable.provider, provider));
  if (status) conditions.push(eq(validationHistoryTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select().from(validationHistoryTable)
    .where(whereClause)
    .orderBy(desc(validationHistoryTable.validatedAt))
    .offset(offset).limit(lim);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(validationHistoryTable).where(whereClause);

  res.json({
    data: rows.map((r) => ({ ...r, validatedAt: r.validatedAt.toISOString() })),
    total: Number(countResult[0].count), page: pg, limit: lim,
  });
});

export default router;

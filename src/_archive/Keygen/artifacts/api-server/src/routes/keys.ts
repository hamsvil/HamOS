import { Router } from "express";
import { db } from "@workspace/db";
import { apiKeysTable, keyTagsTable } from "@workspace/db";
import { eq, and, or, ilike, sql, inArray, isNull } from "drizzle-orm";
import { requireAuth, getClientIp } from "../lib/auth.js";
import { writeAuditLog } from "../lib/audit.js";
import { generateRawKey, hashKey, calculateEntropy, getKeyPrefix, getKeySuffix } from "../lib/keygen.js";

const router = Router();
router.use(requireAuth);

router.get("/expiring", async (req, res) => {
  const userId = req.session.userId!;
  const { days = "7" } = req.query as { days?: string };
  const numDays = Math.min(90, Math.max(1, parseInt(days, 10)));
  const horizon = new Date(Date.now() + numDays * 24 * 60 * 60 * 1000);

  const rows = await db.execute(sql`
    SELECT id, name, provider, key_prefix as "keyPrefix", status,
      expires_at as "expiresAt"
    FROM api_keys
    WHERE user_id = ${userId}
      AND is_archived = false
      AND status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at <= ${horizon}
      AND expires_at >= NOW()
    ORDER BY expires_at ASC
    LIMIT 100
  `);

  res.json(rows.rows);
});

router.get("/", async (req, res) => {
  const { provider, status, environmentId, tag, search, archived, page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;

  const userId = req.session.userId!;
  const conditions = [eq(apiKeysTable.userId, userId)];

  if (provider) conditions.push(eq(apiKeysTable.provider, provider));
  if (status) conditions.push(eq(apiKeysTable.status, status));
  if (environmentId) conditions.push(eq(apiKeysTable.environmentId, parseInt(environmentId, 10)));
  if (archived === "true") conditions.push(eq(apiKeysTable.isArchived, true));
  else conditions.push(eq(apiKeysTable.isArchived, false));
  if (search) conditions.push(ilike(apiKeysTable.name, `%${search}%`));

  let baseQuery = db.select().from(apiKeysTable).where(and(...conditions));

  if (tag) {
    const taggedKeyIds = await db.select({ keyId: keyTagsTable.keyId }).from(keyTagsTable).where(eq(keyTagsTable.tag, tag));
    const ids = taggedKeyIds.map((r) => r.keyId);
    if (ids.length === 0) return res.json({ data: [], total: 0, page: pg, limit: lim });
    conditions.push(inArray(apiKeysTable.id, ids));
  }

  const allRows = await db.select().from(apiKeysTable).where(and(...conditions)).orderBy(sql`${apiKeysTable.createdAt} DESC`).offset(offset).limit(lim);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(apiKeysTable).where(and(...conditions));
  const total = Number(countResult[0].count);

  const keyIds = allRows.map((k) => k.id);
  const tags = keyIds.length > 0 ? await db.select().from(keyTagsTable).where(inArray(keyTagsTable.keyId, keyIds)) : [];
  const tagsByKey: Record<number, string[]> = {};
  for (const t of tags) {
    if (!tagsByKey[t.keyId]) tagsByKey[t.keyId] = [];
    tagsByKey[t.keyId].push(t.tag);
  }

  const data = allRows.map((k) => ({
    ...k,
    keyHash: undefined,
    tags: tagsByKey[k.id] ?? [],
    expiresAt: k.expiresAt?.toISOString() ?? null,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    lastValidatedAt: k.lastValidatedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }));

  res.json({ data, total, page: pg, limit: lim });
});

router.post("/generate", async (req, res) => {
  const userId = req.session.userId!;
  const body = req.body as {
    name: string; provider: string; format: string; length: number;
    customPrefix?: string; scopes?: string[]; expiresAt?: string | null;
    rateLimit?: number; environmentId?: number | null; metadata?: Record<string, unknown>;
    count?: number;
  };

  const rawCount = Number(body.count ?? 1);
  const count = Math.max(1, Math.min(20, Number.isFinite(rawCount) ? rawCount : 1));

  const generated: Array<{
    id: number; fullKey: string; keyPrefix: string; keySuffix: string;
    provider: string; name: string; entropy: number;
  }> = [];

  for (let i = 0; i < count; i++) {
    const suffixLabel = count > 1 ? ` #${i + 1}` : "";
    const rawKey = generateRawKey(body.format as any, body.length, body.customPrefix);
    const keyHash = hashKey(rawKey);
    const keyPrefix = getKeyPrefix(rawKey);
    const keySuffix = getKeySuffix(rawKey);
    const entropy = calculateEntropy(rawKey);

    const rows = await db.insert(apiKeysTable).values({
      userId, name: `${body.name}${suffixLabel}`, provider: body.provider,
      keyHash, keyPrefix, keySuffix,
      scopes: body.scopes ?? [],
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      rateLimit: body.rateLimit ?? 1000,
      environmentId: body.environmentId ?? null,
      metadata: body.metadata ?? {},
    }).returning();
    const key = rows[0];
    generated.push({
      id: key.id, fullKey: rawKey, keyPrefix, keySuffix,
      provider: key.provider, name: key.name, entropy,
    });
  }

  await writeAuditLog({
    userId, action: "key.generate", entityType: "api_key",
    entityId: generated[0]?.id,
    details: { name: body.name, provider: body.provider, format: body.format, count },
    ipAddress: getClientIp(req),
  });

  // Backward compatible: single key returns the same object as before.
  if (count === 1) {
    res.status(201).json(generated[0]);
    return;
  }
  res.status(201).json({ count, keys: generated });
});

router.post("/bulk-revoke", async (req, res) => {
  const userId = req.session.userId!;
  const { ids } = req.body as { ids: number[] };
  if (!ids?.length) return res.status(400).json({ error: "ids required" });
  await db.update(apiKeysTable).set({ status: "revoked", updatedAt: new Date() })
    .where(and(inArray(apiKeysTable.id, ids), eq(apiKeysTable.userId, userId)));
  await writeAuditLog({ userId, action: "key.bulk_revoke", entityType: "api_key", details: { ids }, ipAddress: getClientIp(req) });
  res.json({ ok: true });
});

router.post("/bulk-archive", async (req, res) => {
  const userId = req.session.userId!;
  const { ids } = req.body as { ids: number[] };
  if (!ids?.length) return res.status(400).json({ error: "ids required" });
  await db.update(apiKeysTable).set({ isArchived: true, updatedAt: new Date() })
    .where(and(inArray(apiKeysTable.id, ids), eq(apiKeysTable.userId, userId)));
  res.json({ ok: true });
});

router.post("/import", async (req, res) => {
  const userId = req.session.userId!;
  const { content, provider, environmentId } = req.body as { content: string; provider: string; environmentId?: number | null };
  const lines = content.split("\n").map((l: string) => l.trim()).filter(Boolean);
  let imported = 0;
  let skipped = 0;
  for (const line of lines) {
    try {
      const keyHash = hashKey(line);
      const keyPrefix = getKeyPrefix(line);
      const keySuffix = getKeySuffix(line);
      await db.insert(apiKeysTable).values({
        userId, name: `Imported ${keyPrefix}...`, provider,
        keyHash, keyPrefix, keySuffix,
        environmentId: environmentId ?? null,
      }).onConflictDoNothing();
      imported++;
    } catch {
      skipped++;
    }
  }
  res.json({ imported, skipped });
});

router.get("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const rows = await db.select().from(apiKeysTable).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId))).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const tags = await db.select().from(keyTagsTable).where(eq(keyTagsTable.keyId, id));
  const k = rows[0];
  res.json({ ...k, keyHash: undefined, tags: tags.map((t) => t.tag), expiresAt: k.expiresAt?.toISOString() ?? null, lastValidatedAt: k.lastValidatedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString(), updatedAt: k.updatedAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const body = req.body as { name?: string; scopes?: string[]; expiresAt?: string | null; rateLimit?: number; isFavorite?: boolean; environmentId?: number | null };
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.scopes !== undefined) updates.scopes = body.scopes;
  if (body.expiresAt !== undefined) updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (body.rateLimit !== undefined) updates.rateLimit = body.rateLimit;
  if (body.isFavorite !== undefined) updates.isFavorite = body.isFavorite;
  if (body.environmentId !== undefined) updates.environmentId = body.environmentId;
  const rows = await db.update(apiKeysTable).set(updates as any)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId))).returning();
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const tags = await db.select().from(keyTagsTable).where(eq(keyTagsTable.keyId, id));
  const k = rows[0];
  res.json({ ...k, keyHash: undefined, tags: tags.map((t) => t.tag), expiresAt: k.expiresAt?.toISOString() ?? null, lastValidatedAt: k.lastValidatedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString(), updatedAt: k.updatedAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  await db.delete(apiKeysTable).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  await writeAuditLog({ userId, action: "key.delete", entityType: "api_key", entityId: id, ipAddress: getClientIp(req) });
  res.status(204).end();
});

router.post("/:id/rotate", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const body = (req.body ?? {}) as { format?: string; length?: number; customPrefix?: string };

  const existingRows = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId))).limit(1);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: "Not found" });

  const format = (body.format ?? "hex") as any;
  const length = body.length ?? 32;
  const newRaw = generateRawKey(format, length, body.customPrefix);
  const newHash = hashKey(newRaw);
  const newPrefix = getKeyPrefix(newRaw);
  const newSuffix = getKeySuffix(newRaw);
  const entropy = calculateEntropy(newRaw);

  await db.update(apiKeysTable).set({
    keyHash: newHash, keyPrefix: newPrefix, keySuffix: newSuffix,
    version: (existing.version ?? 0) + 1,
    status: "active",
    lastValidatedAt: null, lastValidStatus: null,
    updatedAt: new Date(),
  }).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));

  await writeAuditLog({
    userId, action: "key.rotate", entityType: "api_key", entityId: id,
    details: { fromVersion: existing.version, toVersion: (existing.version ?? 0) + 1, format },
    ipAddress: getClientIp(req),
  });

  res.json({
    id, fullKey: newRaw, keyPrefix: newPrefix, keySuffix: newSuffix,
    version: (existing.version ?? 0) + 1, entropy,
  });
});

router.post("/:id/revoke", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  await db.update(apiKeysTable).set({ status: "revoked", updatedAt: new Date() })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  await writeAuditLog({ userId, action: "key.revoke", entityType: "api_key", entityId: id, ipAddress: getClientIp(req) });
  res.json({ ok: true });
});

router.post("/:id/archive", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  await db.update(apiKeysTable).set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  res.json({ ok: true });
});

router.post("/:id/restore", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  await db.update(apiKeysTable).set({ isArchived: false, updatedAt: new Date() })
    .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  res.json({ ok: true });
});

router.post("/:id/tags", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { tag } = req.body as { tag: string };
  if (!tag) return res.status(400).json({ error: "tag required" });
  await db.insert(keyTagsTable).values({ keyId: id, tag }).onConflictDoNothing();
  res.json({ ok: true });
});

router.delete("/:id/tags/:tag", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { tag } = req.params;
  await db.delete(keyTagsTable).where(and(eq(keyTagsTable.keyId, id), eq(keyTagsTable.tag, tag)));
  res.status(204).end();
});

router.get("/:id/history", async (req, res) => {
  const { page = "1", limit = "50" } = req.query as Record<string, string>;
  const id = parseInt(req.params.id, 10);
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;

  const { validationHistoryTable } = await import("@workspace/db");
  const rows = await db.select().from(validationHistoryTable)
    .where(eq(validationHistoryTable.keyId, id))
    .orderBy(sql`${validationHistoryTable.validatedAt} DESC`)
    .offset(offset).limit(lim);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(validationHistoryTable).where(eq(validationHistoryTable.keyId, id));

  res.json({
    data: rows.map((r) => ({ ...r, validatedAt: r.validatedAt.toISOString() })),
    total: Number(countResult[0].count), page: pg, limit: lim,
  });
});

export default router;

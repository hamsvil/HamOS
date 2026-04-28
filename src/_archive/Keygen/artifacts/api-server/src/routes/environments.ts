import { Router } from "express";
import { db } from "@workspace/db";
import { environmentsTable, apiKeysTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = req.session.userId!;
  const envs = await db.select().from(environmentsTable).where(eq(environmentsTable.userId, userId));

  const withCounts = await Promise.all(envs.map(async (env) => {
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(apiKeysTable).where(eq(apiKeysTable.environmentId, env.id));
    return { ...env, keyCount: Number(countResult[0].count), createdAt: env.createdAt.toISOString() };
  }));

  res.json(withCounts);
});

router.post("/", async (req, res) => {
  const userId = req.session.userId!;
  const { name, color, isDefault } = req.body as { name: string; color?: string; isDefault?: boolean };
  if (!name) return res.status(400).json({ error: "name required" });

  if (isDefault) {
    await db.update(environmentsTable).set({ isDefault: false }).where(eq(environmentsTable.userId, userId));
  }

  const rows = await db.insert(environmentsTable).values({
    userId, name, color: color ?? "#00BFFF", isDefault: isDefault ?? false,
  }).returning();

  const env = rows[0];
  res.status(201).json({ ...env, keyCount: 0, createdAt: env.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const { name, color, isDefault } = req.body as { name?: string; color?: string; isDefault?: boolean };

  if (isDefault) {
    await db.update(environmentsTable).set({ isDefault: false }).where(eq(environmentsTable.userId, userId));
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;
  if (isDefault !== undefined) updates.isDefault = isDefault;

  const rows = await db.update(environmentsTable).set(updates as any)
    .where(and(eq(environmentsTable.id, id), eq(environmentsTable.userId, userId))).returning();

  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(apiKeysTable).where(eq(apiKeysTable.environmentId, id));
  res.json({ ...rows[0], keyCount: Number(countResult[0].count), createdAt: rows[0].createdAt.toISOString() });
});

router.get("/:id/keys", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

  const envRows = await db.select().from(environmentsTable)
    .where(and(eq(environmentsTable.id, id), eq(environmentsTable.userId, userId))).limit(1);
  if (!envRows[0]) return res.status(404).json({ error: "Environment not found" });

  const rows = await db.select().from(apiKeysTable)
    .where(and(eq(apiKeysTable.environmentId, id), eq(apiKeysTable.userId, userId)))
    .orderBy(sql`${apiKeysTable.createdAt} DESC`)
    .limit(500);

  res.json(rows.map((k) => ({
    id: k.id, name: k.name, provider: k.provider, status: k.status,
    keyPrefix: k.keyPrefix, isArchived: k.isArchived,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  })));
});

router.delete("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  await db.delete(environmentsTable).where(and(eq(environmentsTable.id, id), eq(environmentsTable.userId, userId)));
  res.status(204).end();
});

export default router;

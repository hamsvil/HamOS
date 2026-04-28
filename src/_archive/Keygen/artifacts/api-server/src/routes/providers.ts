import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { getAllCircuitStatus } from "../lib/circuitBreaker.js";
import { pingProviderEndpoint, BUILTIN_PROVIDERS } from "../lib/providers.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const rows = await db.select().from(providersTable).orderBy(providersTable.name);
  res.json(rows);
});

router.get("/templates", async (_req, res) => {
  res.json(BUILTIN_PROVIDERS);
});

router.post("/import", async (req, res) => {
  const { providers } = (req.body ?? {}) as { providers?: Array<Record<string, any>> };
  if (!Array.isArray(providers) || providers.length === 0) {
    return res.status(400).json({ error: "providers array required" });
  }
  let imported = 0, skipped = 0;
  const errors: Array<{ slug: string; error: string }> = [];
  for (const p of providers) {
    if (!p.slug || !p.name || !p.validateUrl) {
      skipped++;
      errors.push({ slug: String(p.slug ?? "?"), error: "missing required fields" });
      continue;
    }
    try {
      await db.insert(providersTable).values({
        slug: String(p.slug),
        name: String(p.name),
        category: String(p.category ?? "custom"),
        validateUrl: String(p.validateUrl),
        validateMethod: String(p.validateMethod ?? "GET"),
        validateHeader: String(p.validateHeader ?? "Authorization"),
        docsUrl: String(p.docsUrl ?? ""),
        prefixPattern: p.prefixPattern ?? null,
        timeoutMs: Number(p.timeoutMs ?? 10000),
      }).onConflictDoNothing();
      imported++;
    } catch (e: any) {
      skipped++;
      errors.push({ slug: String(p.slug), error: e?.message ?? "unknown" });
    }
  }
  res.json({ imported, skipped, errors });
});

router.post("/", async (req, res) => {
  const body = req.body as {
    slug: string; name: string; category: string;
    validateUrl: string; validateMethod: string; validateHeader: string;
    docsUrl: string; prefixPattern?: string; timeoutMs?: number;
  };
  const row = await db.insert(providersTable).values({
    slug: body.slug, name: body.name, category: body.category,
    validateUrl: body.validateUrl, validateMethod: body.validateMethod,
    validateHeader: body.validateHeader, docsUrl: body.docsUrl,
    prefixPattern: body.prefixPattern ?? null,
    timeoutMs: body.timeoutMs ?? 10000,
  }).returning();
  res.status(201).json(row[0]);
});

router.get("/circuit-status", async (_req, res) => {
  res.json(getAllCircuitStatus());
});

router.get("/:slug/ping", async (req, res) => {
  const slug = req.params.slug;
  const row = await db.select().from(providersTable).where(eq(providersTable.slug, slug)).limit(1);
  if (!row[0]) return res.status(404).json({ error: "Provider not found" });
  const result = await pingProviderEndpoint(row[0].validateUrl, row[0].timeoutMs);
  res.json({ slug, ...result });
});

router.delete("/:slug", async (req, res) => {
  await db.delete(providersTable).where(eq(providersTable.slug, req.params.slug));
  res.status(204).end();
});

export default router;

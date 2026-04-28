// @ts-nocheck
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { memoryTable } from "@workspace/db/schema";
import { eq, gt } from "drizzle-orm";

const router: IRouter = Router();

router.get("/memory", async (req, res) => {
  try {
    const now = new Date();
    const category = req.query.category as string | undefined;
    const rows = await db.select().from(memoryTable).where(gt(memoryTable.expiresAt, now));
    const filtered = category ? rows.filter((r) => r.category === category) : rows;
    res.json(filtered);
  } catch (err) {
    req.log.error(err, "Failed to list memory");
    res.status(500).json({ error: "Failed to list memory" });
  }
});

router.get("/memory/:key", async (req, res): Promise<void> => {
  try {
    const now = new Date();
    const [entry] = await db.select().from(memoryTable).where(eq(memoryTable.key, req.params.key));
    if (!entry) {
      res.status(404).json({ error: "Memory entry not found" });
      return;
    }
    if (entry.expiresAt && entry.expiresAt < now) {
      res.status(404).json({ error: "Memory entry has expired" });
      return;
    }
    res.json(entry);
  } catch (err) {
    req.log.error(err, "Failed to get memory entry");
    res.status(500).json({ error: "Failed to get memory entry" });
  }
});

router.put("/memory/:key", async (req, res): Promise<void> => {
  try {
    const { value, category, ttlHours } = req.body as { value: string; category?: string; ttlHours?: number };
    if (!value) {
      res.status(400).json({ error: "value is required" });
      return;
    }
    const now = new Date();
    const hours = ttlHours ?? 24;
    const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);
    await db
      .insert(memoryTable)
      .values({ key: req.params.key, value, category: category ?? "general", expiresAt })
      .onConflictDoUpdate({
        target: memoryTable.key,
        set: { value, category: category ?? "general", updatedAt: now, expiresAt },
      });
    const [entry] = await db.select().from(memoryTable).where(eq(memoryTable.key, req.params.key));
    res.json(entry);
  } catch (err) {
    req.log.error(err, "Failed to store memory");
    res.status(500).json({ error: "Failed to store memory" });
  }
});

router.delete("/memory/:key", async (req, res): Promise<void> => {
  try {
    const [entry] = await db.select().from(memoryTable).where(eq(memoryTable.key, req.params.key));
    if (!entry) {
      res.status(404).json({ error: "Memory entry not found" });
      return;
    }
    await db.delete(memoryTable).where(eq(memoryTable.key, req.params.key));
    res.json({ message: "Memory deleted" });
  } catch (err) {
    req.log.error(err, "Failed to delete memory");
    res.status(500).json({ error: "Failed to delete memory" });
  }
});

router.delete("/memory", async (req, res) => {
  try {
    await db.delete(memoryTable);
    res.json({ message: "All memory cleared" });
  } catch (err) {
    req.log.error(err, "Failed to clear memory");
    res.status(500).json({ error: "Failed to clear memory" });
  }
});

export default router;

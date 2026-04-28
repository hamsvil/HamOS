import { Router } from "express";
import { db } from "@workspace/db";
import { scheduledJobsTable, apiKeysTable, validationHistoryTable, providersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { validateKeyAgainstProvider } from "../lib/providers.js";
import cron from "node-cron";

const router = Router();
router.use(requireAuth);

const activeJobs = new Map<number, cron.ScheduledTask>();

export async function startScheduledJob(jobId: number) {
  const rows = await db.select({ job: scheduledJobsTable, key: apiKeysTable, provider: providersTable })
    .from(scheduledJobsTable)
    .innerJoin(apiKeysTable, eq(scheduledJobsTable.keyId, apiKeysTable.id))
    .leftJoin(providersTable, eq(apiKeysTable.provider, providersTable.slug))
    .where(eq(scheduledJobsTable.id, jobId))
    .limit(1);

  if (!rows[0] || !rows[0].job.isActive) return;

  const { job, key, provider } = rows[0];
  if (!cron.validate(job.cronExpression)) return;

  const task = cron.schedule(job.cronExpression, async () => {
    await db.update(scheduledJobsTable).set({ isRunning: true }).where(eq(scheduledJobsTable.id, job.id));
    try {
      if (provider && provider.validateUrl) {
        const result = await validateKeyAgainstProvider(key.keyPrefix + "...", provider);
        await db.insert(validationHistoryTable).values({
          keyId: key.id, provider: key.provider, keyPrefix: key.keyPrefix,
          status: result.status, responseTime: result.responseTime,
          roundedResponseTime: Math.round(result.responseTime / 100) * 100,
          errorMessage: result.error ?? null, isBatch: false,
        });
        await db.update(scheduledJobsTable).set({
          lastRunAt: new Date(), lastRunStatus: result.status, isRunning: false,
        }).where(eq(scheduledJobsTable.id, job.id));
      }
    } catch {
      await db.update(scheduledJobsTable).set({ isRunning: false, lastRunStatus: "error" })
        .where(eq(scheduledJobsTable.id, job.id));
    }
  });

  activeJobs.set(jobId, task);
}

router.get("/", async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db.select({ job: scheduledJobsTable, keyName: apiKeysTable.name })
    .from(scheduledJobsTable)
    .innerJoin(apiKeysTable, eq(scheduledJobsTable.keyId, apiKeysTable.id))
    .where(eq(scheduledJobsTable.userId, userId));

  res.json(rows.map(({ job, keyName }) => ({
    ...job,
    keyName,
    lastRunAt: job.lastRunAt?.toISOString() ?? null,
    nextRunAt: job.nextRunAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  })));
});

router.post("/", async (req, res) => {
  const userId = req.session.userId!;
  const { keyId, cronExpression, isActive = true } = req.body as { keyId: number; cronExpression: string; isActive?: boolean };

  if (!cron.validate(cronExpression)) return res.status(400).json({ error: "Invalid cron expression" });

  const rows = await db.insert(scheduledJobsTable).values({
    userId, keyId, cronExpression, isActive,
  }).returning();

  const job = rows[0];
  if (isActive) await startScheduledJob(job.id);

  const keyRows = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, keyId)).limit(1);
  res.status(201).json({ ...job, keyName: keyRows[0]?.name ?? "", lastRunAt: null, nextRunAt: null, createdAt: job.createdAt.toISOString() });
});

router.patch("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const { cronExpression, isActive } = req.body as { cronExpression?: string; isActive?: boolean };

  if (cronExpression && !cron.validate(cronExpression)) return res.status(400).json({ error: "Invalid cron expression" });

  const updates: Record<string, unknown> = {};
  if (cronExpression !== undefined) updates.cronExpression = cronExpression;
  if (isActive !== undefined) updates.isActive = isActive;

  const rows = await db.update(scheduledJobsTable).set(updates as any)
    .where(and(eq(scheduledJobsTable.id, id), eq(scheduledJobsTable.userId, userId))).returning();

  if (!rows[0]) return res.status(404).json({ error: "Not found" });

  const existing = activeJobs.get(id);
  if (existing) { existing.stop(); activeJobs.delete(id); }
  if (rows[0].isActive) await startScheduledJob(id);

  const keyRows = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, rows[0].keyId)).limit(1);
  const j = rows[0];
  res.json({ ...j, keyName: keyRows[0]?.name ?? "", lastRunAt: j.lastRunAt?.toISOString() ?? null, nextRunAt: j.nextRunAt?.toISOString() ?? null, createdAt: j.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const userId = req.session.userId!;
  const id = parseInt(req.params.id, 10);
  const existing = activeJobs.get(id);
  if (existing) { existing.stop(); activeJobs.delete(id); }
  await db.delete(scheduledJobsTable).where(and(eq(scheduledJobsTable.id, id), eq(scheduledJobsTable.userId, userId)));
  res.status(204).end();
});

router.post("/:id/run-now", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await startScheduledJob(id);
  res.json({ ok: true });
});

export default router;

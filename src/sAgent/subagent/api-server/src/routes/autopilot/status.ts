// @ts-nocheck
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, logsTable, memoryTable, toolsTable } from "@workspace/db/schema";
import { eq, count, gt } from "drizzle-orm";
import { getSystemInfo, runningTasks } from "../../lib/agentRunner.js";
import { BUILTIN_TOOL_DEFINITIONS } from "../../lib/toolExecutor.js";

const router: IRouter = Router();

router.get("/status", async (req, res) => {
  try {
    const systemInfo = await getSystemInfo();

    const [taskStats] = await db
      .select({ total: count() })
      .from(tasksTable);

    const runningCount = runningTasks.size;

    const [memCount] = await db
      .select({ total: count() })
      .from(memoryTable)
      .where(gt(memoryTable.expiresAt, new Date()));

    const [toolCount] = await db
      .select({ total: count() })
      .from(toolsTable)
      .where(eq(toolsTable.enabled, true));

    res.json({
      status: "operational",
      system: systemInfo,
      tasks: {
        total: taskStats?.total ?? 0,
        running: runningCount,
        runningIds: Array.from(runningTasks),
      },
      memory: {
        active: memCount?.total ?? 0,
      },
      tools: {
        builtin: BUILTIN_TOOL_DEFINITIONS.length,
        dynamic: toolCount?.total ?? 0,
        total: BUILTIN_TOOL_DEFINITIONS.length + Number(toolCount?.total ?? 0),
      },
    });
  } catch (err) {
    req.log.error(err, "Failed to get status");
    res.status(500).json({ error: "Failed to get status" });
  }
});

export default router;

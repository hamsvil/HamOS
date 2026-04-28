// @ts-nocheck
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { logsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { taskEventBus, type TaskLogEvent } from "../../lib/taskEvents.js";

const router: IRouter = Router();

router.get("/tasks/:id/logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 500), 1000);
    const logs = await db
      .select()
      .from(logsTable)
      .where(eq(logsTable.taskId, req.params.id))
      .orderBy(desc(logsTable.createdAt))
      .limit(limit);
    res.json(logs.reverse());
  } catch (err) {
    req.log.error(err, "Failed to get logs");
    res.status(500).json({ error: "Failed to get logs" });
  }
});

router.get("/tasks/:id/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const taskId = req.params.id;

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("connected", { taskId, timestamp: new Date().toISOString() });

  const handler = (logEvent: TaskLogEvent) => {
    if (logEvent.taskId === taskId) {
      send("log", logEvent);
    }
  };

  taskEventBus.on("log", handler);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    taskEventBus.removeListener("log", handler);
  });
});

router.get("/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("connected", { timestamp: new Date().toISOString() });

  const handler = (logEvent: TaskLogEvent) => {
    send("log", logEvent);
  };

  taskEventBus.on("log", handler);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    taskEventBus.removeListener("log", handler);
  });
});

export default router;

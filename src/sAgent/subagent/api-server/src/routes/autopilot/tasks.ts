// @ts-nocheck
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { startTask, cancelTask, createTask } from "../../lib/agentRunner.js";

const router: IRouter = Router();

router.get("/tasks", async (req, res) => {
  try {
    const tasks = await db.select().from(tasksTable).orderBy(desc(tasksTable.createdAt)).limit(100);
    res.json(tasks);
  } catch (err) {
    req.log.error(err, "Failed to list tasks");
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.post("/tasks", async (req, res): Promise<void> => {
  try {
    const { title, description, autoStart } = req.body as {
      title: string;
      description: string;
      autoStart?: boolean;
    };
    if (!title || !description) {
      res.status(400).json({ error: "title and description are required" });
      return;
    }
    const id = await createTask(title, description);
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (autoStart) {
      startTask(id).catch((err) => req.log.error(err, `Background task ${id} failed`));
    }
    res.status(201).json(task);
  } catch (err) {
    req.log.error(err, "Failed to create task");
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    req.log.error(err, "Failed to get task");
    res.status(500).json({ error: "Failed to get task" });
  }
});

router.post("/tasks/:id/start", async (req, res): Promise<void> => {
  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.status === "running") {
      res.status(400).json({ error: "Task is already running" });
      return;
    }
    startTask(req.params.id).catch((err) => req.log.error(err, `Background task ${req.params.id} failed`));
    res.json({ message: "Task started", taskId: req.params.id });
  } catch (err) {
    req.log.error(err, "Failed to start task");
    res.status(500).json({ error: "Failed to start task" });
  }
});

router.post("/tasks/:id/cancel", async (req, res): Promise<void> => {
  try {
    const cancelled = cancelTask(req.params.id);
    if (!cancelled) {
      res.status(400).json({ error: "Task is not running or does not exist" });
      return;
    }
    res.json({ message: "Cancel signal sent", taskId: req.params.id });
  } catch (err) {
    req.log.error(err, "Failed to cancel task");
    res.status(500).json({ error: "Failed to cancel task" });
  }
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, req.params.id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    if (task.status === "running") {
      res.status(400).json({ error: "Cannot delete a running task. Cancel it first." });
      return;
    }
    await db.delete(tasksTable).where(eq(tasksTable.id, req.params.id));
    res.json({ message: "Task deleted" });
  } catch (err) {
    req.log.error(err, "Failed to delete task");
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;

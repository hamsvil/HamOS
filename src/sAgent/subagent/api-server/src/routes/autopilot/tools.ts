// @ts-nocheck
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { toolsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { BUILTIN_TOOL_DEFINITIONS } from "../../lib/toolExecutor.js";

const router: IRouter = Router();

router.get("/tools", async (req, res) => {
  try {
    const dynamicTools = await db.select().from(toolsTable).orderBy(toolsTable.name);
    const builtins = BUILTIN_TOOL_DEFINITIONS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.input_schema,
      implementation: null,
      enabled: true,
      isBuiltin: true,
      createdAt: null,
      updatedAt: null,
    }));
    res.json([...builtins, ...dynamicTools.map((t) => ({ ...t, isBuiltin: false }))]);
  } catch (err) {
    req.log.error(err, "Failed to list tools");
    res.status(500).json({ error: "Failed to list tools" });
  }
});

router.post("/tools", async (req, res): Promise<void> => {
  try {
    const { name, description, inputSchema, implementation } = req.body as {
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
      implementation: string;
    };
    if (!name || !description || !inputSchema || !implementation) {
      res.status(400).json({ error: "name, description, inputSchema, and implementation are required" });
      return;
    }
    const builtinNames = BUILTIN_TOOL_DEFINITIONS.map((t) => t.name);
    if (builtinNames.includes(name)) {
      res.status(400).json({ error: `Cannot override builtin tool: ${name}` });
      return;
    }
    await db
      .insert(toolsTable)
      .values({ name, description, inputSchema, implementation, enabled: true })
      .onConflictDoUpdate({
        target: toolsTable.name,
        set: { description, inputSchema, implementation, updatedAt: new Date() },
      });
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.name, name));
    res.status(201).json(tool);
  } catch (err) {
    req.log.error(err, "Failed to register tool");
    res.status(500).json({ error: "Failed to register tool" });
  }
});

router.get("/tools/:name", async (req, res): Promise<void> => {
  try {
    const builtin = BUILTIN_TOOL_DEFINITIONS.find((t) => t.name === req.params.name);
    if (builtin) {
      res.json({ ...builtin, isBuiltin: true, enabled: true });
      return;
    }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.name, req.params.name));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.json({ ...tool, isBuiltin: false });
  } catch (err) {
    req.log.error(err, "Failed to get tool");
    res.status(500).json({ error: "Failed to get tool" });
  }
});

router.patch("/tools/:name", async (req, res): Promise<void> => {
  try {
    const { enabled } = req.body as { enabled: boolean };
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.name, req.params.name));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    await db.update(toolsTable).set({ enabled, updatedAt: new Date() }).where(eq(toolsTable.name, req.params.name));
    const [updated] = await db.select().from(toolsTable).where(eq(toolsTable.name, req.params.name));
    res.json(updated);
  } catch (err) {
    req.log.error(err, "Failed to update tool");
    res.status(500).json({ error: "Failed to update tool" });
  }
});

router.delete("/tools/:name", async (req, res): Promise<void> => {
  try {
    const builtinNames = BUILTIN_TOOL_DEFINITIONS.map((t) => t.name);
    if (builtinNames.includes(req.params.name)) {
      res.status(400).json({ error: "Cannot delete builtin tools" });
      return;
    }
    const [tool] = await db.select().from(toolsTable).where(eq(toolsTable.name, req.params.name));
    if (!tool) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    await db.delete(toolsTable).where(eq(toolsTable.name, req.params.name));
    res.json({ message: "Tool deleted" });
  } catch (err) {
    req.log.error(err, "Failed to delete tool");
    res.status(500).json({ error: "Failed to delete tool" });
  }
});

export default router;

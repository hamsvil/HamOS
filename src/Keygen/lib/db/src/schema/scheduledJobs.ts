import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { apiKeysTable } from "./apiKeys";

export const scheduledJobsTable = pgTable("scheduled_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  keyId: integer("key_id").notNull().references(() => apiKeysTable.id, { onDelete: "cascade" }),
  cronExpression: text("cron_expression").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isRunning: boolean("is_running").notNull().default(false),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertScheduledJobSchema = createInsertSchema(scheduledJobsTable).omit({ id: true, createdAt: true, isRunning: true });
export type InsertScheduledJob = z.infer<typeof insertScheduledJobSchema>;
export type ScheduledJob = typeof scheduledJobsTable.$inferSelect;

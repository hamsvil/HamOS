import { pgTable, serial, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"),
  payload: jsonb("payload").notNull().default({}),
  hmacSignature: text("hmac_signature"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("webhook_logs_created_at_idx").on(t.createdAt),
]);

export const insertWebhookLogSchema = createInsertSchema(webhookLogsTable).omit({ id: true, createdAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogsTable.$inferSelect;

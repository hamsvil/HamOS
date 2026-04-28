import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { apiKeysTable } from "./apiKeys";

export const validationHistoryTable = pgTable("validation_history", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").references(() => apiKeysTable.id, { onDelete: "set null" }),
  provider: text("provider").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  status: text("status").notNull(),
  responseTime: integer("response_time"),
  roundedResponseTime: integer("rounded_response_time"),
  errorMessage: text("error_message"),
  isBatch: boolean("is_batch").notNull().default(false),
  batchId: text("batch_id"),
  validatedAt: timestamp("validated_at").notNull().defaultNow(),
}, (t) => [
  index("validation_history_key_id_idx").on(t.keyId),
  index("validation_history_validated_at_idx").on(t.validatedAt),
  index("validation_history_provider_idx").on(t.provider),
  index("validation_history_batch_id_idx").on(t.batchId),
]);

export const insertValidationHistorySchema = createInsertSchema(validationHistoryTable).omit({ id: true, validatedAt: true });
export type InsertValidationHistory = z.infer<typeof insertValidationHistorySchema>;
export type ValidationHistory = typeof validationHistoryTable.$inferSelect;

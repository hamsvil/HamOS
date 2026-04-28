import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("ai"),
  validateUrl: text("validate_url").notNull(),
  validateMethod: text("validate_method").notNull().default("GET"),
  validateHeader: text("validate_header").notNull(),
  prefixPattern: text("prefix_pattern"),
  keyExample: text("key_example"),
  docsUrl: text("docs_url").notNull(),
  knownRateLimit: text("known_rate_limit"),
  timeoutMs: integer("timeout_ms").notNull().default(10000),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProviderSchema = createInsertSchema(providersTable).omit({ id: true, createdAt: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providersTable.$inferSelect;

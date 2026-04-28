import { pgTable, serial, text, boolean, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { environmentsTable } from "./environments";

export const apiKeysTable = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  environmentId: integer("environment_id").references(() => environmentsTable.id),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  keySuffix: text("key_suffix").notNull(),
  status: text("status").notNull().default("active"),
  scopes: text("scopes").array().notNull().default([]),
  expiresAt: timestamp("expires_at"),
  rateLimit: integer("rate_limit").notNull().default(1000),
  usageCount: integer("usage_count").notNull().default(0),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  version: integer("version").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  lastValidatedAt: timestamp("last_validated_at"),
  lastValidStatus: text("last_valid_status"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("api_keys_user_id_idx").on(t.userId),
  index("api_keys_key_hash_idx").on(t.keyHash),
  index("api_keys_status_idx").on(t.status),
  index("api_keys_provider_idx").on(t.provider),
  index("api_keys_expires_at_idx").on(t.expiresAt),
]);

export const insertApiKeySchema = createInsertSchema(apiKeysTable).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true, version: true });
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeysTable.$inferSelect;

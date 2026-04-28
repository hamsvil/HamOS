import { pgTable, serial, text, integer, timestamp, unique, index } from "drizzle-orm/pg-core";
import { apiKeysTable } from "./apiKeys";

export const keyTagsTable = pgTable("key_tags", {
  id: serial("id").primaryKey(),
  keyId: integer("key_id").notNull().references(() => apiKeysTable.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  unique("key_tag_unique").on(t.keyId, t.tag),
  index("key_tags_key_id_idx").on(t.keyId),
  index("key_tags_tag_idx").on(t.tag),
]);

export type KeyTag = typeof keyTagsTable.$inferSelect;

import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const environmentsTable = pgTable("environments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  color: text("color").notNull().default("#00BFFF"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEnvironmentSchema = createInsertSchema(environmentsTable).omit({ id: true, createdAt: true });
export type InsertEnvironment = z.infer<typeof insertEnvironmentSchema>;
export type Environment = typeof environmentsTable.$inferSelect;

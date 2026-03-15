import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { jsonArrayColumn } from "./helpers";

export const garments = sqliteTable(
  "garments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    dollSize: text("doll_size").notNull(),
    colors: jsonArrayColumn("colors")
      .notNull()
      .default(sql`'[]'`),
    tags: jsonArrayColumn("tags")
      .notNull()
      .default(sql`'[]'`),
    imageUrl: text("image_url"),
    locationId: text("location_id").references(() => storageLocations.id),
    status: text("status").notNull().default("stored"),
    lastScannedAt: integer("last_scanned_at").notNull(),
    confidenceDecayDays: integer("confidence_decay_days").notNull().default(30),
    checkedOutAt: integer("checked_out_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_garments_user_id").on(table.userId),
    index("idx_garments_location_id").on(table.locationId),
    index("idx_garments_status").on(table.status),
  ],
);

export const storageCases = sqliteTable("storage_cases", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  rows: integer("rows").notNull().default(5),
  cols: integer("cols").notNull().default(3),
  createdAt: integer("created_at").notNull(),
});

export const storageLocations = sqliteTable(
  "storage_locations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    caseId: text("case_id")
      .notNull()
      .references(() => storageCases.id),
    label: text("label").notNull(),
    row: integer("row_num").notNull(),
    col: integer("col_num").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_locations_case_id").on(table.caseId)],
);

export const coordinates = sqliteTable("coordinates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  garmentIds: jsonArrayColumn("garment_ids")
    .notNull()
    .default(sql`'[]'`),
  isAiGenerated: integer("is_ai_generated", { mode: "boolean" })
    .notNull()
    .default(false),
  memo: text("memo"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

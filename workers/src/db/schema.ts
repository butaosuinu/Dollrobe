import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { jsonArrayColumn } from "./helpers";

export const garments = sqliteTable(
  "garments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    dollSizes: jsonArrayColumn("doll_sizes")
      .notNull()
      .default(sql`'[]'`),
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
    confidenceDecayDaysOverride: integer("confidence_decay_days_override"),
    recentCheckoutCount: integer("recent_checkout_count").notNull().default(0),
    brand: text("brand"),
    description: text("description"),
    setContents: text("set_contents"),
    checkedOutAt: integer("checked_out_at"),
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("idx_garments_user_id").on(table.userId),
    index("idx_garments_location_id").on(table.locationId),
    index("idx_garments_status").on(table.status),
    index("idx_garments_archived_at").on(table.archivedAt),
  ],
);

export const storageCases = sqliteTable("storage_cases", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("grid"),
  description: text("description"),
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
    customName: text("custom_name"),
    description: text("description"),
    row: integer("row_num").notNull(),
    col: integer("col_num").notNull(),
    lastVisitedAt: integer("last_visited_at"),
    confirmAllCount: integer("confirm_all_count").notNull().default(0),
    correctionCount: integer("correction_count").notNull().default(0),
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

export const dolls = sqliteTable(
  "dolls",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    headModel: text("head_model"),
    bodySize: text("body_size").notNull(),
    maker: text("maker"),
    customizer: text("customizer"),
    imageUrl: text("image_url"),
    memo: text("memo"),
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_dolls_user_id").on(table.userId)],
);

export const digests = sqliteTable(
  "digests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    accuracyScore: real("accuracy_score").notNull().default(1.0),
    confirmedCount: integer("confirmed_count").notNull().default(0),
    uncertainCount: integer("uncertain_count").notNull().default(0),
    unknownCount: integer("unknown_count").notNull().default(0),
    totalGarments: integer("total_garments").notNull().default(0),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    generatedAt: integer("generated_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_digests_user_id").on(table.userId),
    index("idx_digests_generated_at").on(table.generatedAt),
  ],
);

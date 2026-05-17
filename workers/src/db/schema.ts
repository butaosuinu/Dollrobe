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

export const storageCases = sqliteTable(
  "storage_cases",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull().default("grid"),
    description: text("description"),
    rows: integer("rows").notNull().default(5),
    cols: integer("cols").notNull().default(3),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_storage_cases_user_id").on(table.userId)],
);

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
  (table) => [
    index("idx_locations_case_id").on(table.caseId),
    index("idx_storage_locations_user_id").on(table.userId),
  ],
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

// "user" / "session" は better-auth がカラム生成を所有する shadow 定義。
// better-auth 側の additionalFields / 公式マイグレーション (workers/migrations/0002_auth.sql,
// 0014_admin_roles.sql) と整合する形で定義する。`drizzle-kit generate` に
// このテーブルの DDL を委ねないこと。Drizzle からは read / 限定的な update のみ使う。
export const users = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    role: text("role").notNull().default("user"),
    frozen: integer("frozen", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("createdAt").notNull(),
    updatedAt: integer("updatedAt").notNull(),
  },
  (table) => [
    index("idx_user_email").on(table.email),
    index("idx_user_role").on(table.role),
    index("idx_user_frozen").on(table.frozen),
  ],
);

export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expiresAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt").notNull(),
    updatedAt: integer("updatedAt").notNull(),
  },
  (table) => [
    index("idx_session_userId").on(table.userId),
    index("idx_session_token").on(table.token),
  ],
);

export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    targetUserId: text("target_user_id"),
    metadata: text("metadata"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_admin_audit_logs_actor").on(table.actorUserId),
    index("idx_admin_audit_logs_target").on(table.targetUserId),
    index("idx_admin_audit_logs_created_at").on(table.createdAt),
  ],
);

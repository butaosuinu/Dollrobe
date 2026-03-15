import { createId } from "@paralleldrive/cuid2";
import { TEMP_USER_ID } from "../../src/trpc/lib/d1-helpers";

type InsertGarmentParams = {
  readonly db: D1Database;
  readonly overrides?: Partial<{
    readonly id: string;
    readonly name: string;
    readonly category: string;
    readonly dollSize: string;
    readonly colors: readonly string[];
    readonly tags: readonly string[];
    readonly imageUrl: string;
    readonly locationId: string;
    readonly status: string;
    readonly lastScannedAt: number;
    readonly confidenceDecayDays: number;
    readonly checkedOutAt: number;
  }>;
};

export const insertGarment = async ({
  db,
  overrides = {},
}: InsertGarmentParams) => {
  const id = overrides.id ?? createId();
  const now = Date.now();

  await db
    .prepare(
      `INSERT INTO garments (id, user_id, name, category, doll_size, colors, tags, image_url, location_id, status, last_scanned_at, confidence_decay_days, checked_out_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    )
    .bind(
      id,
      TEMP_USER_ID,
      overrides.name ?? "テストドレス",
      overrides.category ?? "dress",
      overrides.dollSize ?? "MSD",
      JSON.stringify(overrides.colors ?? []),
      JSON.stringify(overrides.tags ?? []),
      overrides.imageUrl ?? null,
      overrides.locationId ?? null,
      overrides.status ?? "stored",
      overrides.lastScannedAt ?? now,
      overrides.confidenceDecayDays ?? 30,
      overrides.checkedOutAt ?? null,
      now,
      now,
    )
    .run();

  return { id };
};

type InsertStorageCaseParams = {
  readonly db: D1Database;
  readonly overrides?: Partial<{
    readonly id: string;
    readonly name: string;
    readonly rows: number;
    readonly cols: number;
    readonly createdAt: number;
  }>;
};

export const insertStorageCase = async ({
  db,
  overrides = {},
}: InsertStorageCaseParams) => {
  const id = overrides.id ?? createId();
  const now = overrides.createdAt ?? Date.now();

  await db
    .prepare(
      "INSERT INTO storage_cases (id, user_id, name, rows, cols, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(
      id,
      TEMP_USER_ID,
      overrides.name ?? "テストケース",
      overrides.rows ?? 3,
      overrides.cols ?? 2,
      now,
    )
    .run();

  return { id };
};

type InsertStorageLocationParams = {
  readonly db: D1Database;
  readonly overrides?: Partial<{
    readonly id: string;
    readonly caseId: string;
    readonly label: string;
    readonly row: number;
    readonly col: number;
  }>;
};

export const insertStorageLocation = async ({
  db,
  overrides = {},
}: InsertStorageLocationParams) => {
  const id = overrides.id ?? createId();
  const caseId = overrides.caseId ?? createId();
  const now = Date.now();

  await db
    .prepare(
      "INSERT INTO storage_locations (id, user_id, case_id, label, row_num, col_num, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(
      id,
      TEMP_USER_ID,
      caseId,
      overrides.label ?? "A-1",
      overrides.row ?? 0,
      overrides.col ?? 0,
      now,
    )
    .run();

  return { id, caseId };
};

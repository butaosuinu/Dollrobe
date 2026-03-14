import type { D1Database } from "@cloudflare/workers-types";
import type { Garment } from "@/types";
import {
  type GarmentRow,
  toGarment,
  wrapDbError,
} from "../trpc/lib/d1-helpers";

type FilterCandidate = {
  readonly column: string;
  readonly value: string | undefined;
};

type FieldCandidate = {
  readonly column: string;
  readonly value: string | number | undefined;
};

type FieldUpdate = {
  readonly column: string;
  readonly value: string | number;
};

const isDefinedFilter = (
  f: FilterCandidate,
): f is { readonly column: string; readonly value: string } =>
  f.value !== undefined;

const isDefinedField = (f: FieldCandidate): f is FieldUpdate =>
  f.value !== undefined;

export const findGarments = async ({
  db,
  userId,
  filters,
}: {
  readonly db: D1Database;
  readonly userId: string;
  readonly filters: {
    readonly category?: string;
    readonly status?: string;
    readonly dollSize?: string;
    readonly locationId?: string;
  };
}): Promise<readonly Garment[]> => {
  const filterCandidates: readonly FilterCandidate[] = [
    { column: "category", value: filters.category },
    { column: "status", value: filters.status },
    { column: "doll_size", value: filters.dollSize },
    { column: "location_id", value: filters.locationId },
  ];

  const activeFilters = filterCandidates.filter(isDefinedFilter);

  const conditions = [
    "user_id = ?1",
    ...activeFilters.map((f, i) => `${f.column} = ?${String(i + 2)}`),
  ];
  const params: ReadonlyArray<string | number> = [
    userId,
    ...activeFilters.map((f) => f.value),
  ];

  const sql = `SELECT * FROM garments WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC`;

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<GarmentRow>()
    .catch(wrapDbError("fetch garments"));

  return result.results.map(toGarment);
};

export const findGarmentById = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<Garment | undefined> => {
  const row = await db
    .prepare("SELECT * FROM garments WHERE id = ?1 AND user_id = ?2")
    .bind(id, userId)
    .first<GarmentRow>()
    .catch(wrapDbError("fetch garment"));

  if (row === null) {
    return undefined;
  }

  return toGarment(row);
};

export const insertGarment = async ({
  db,
  id,
  userId,
  name,
  category,
  dollSize,
  colors,
  tags,
  imageUrl,
  locationId,
  status,
  lastScannedAt,
  confidenceDecayDays,
  checkedOutAt,
  createdAt,
  updatedAt,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly category: string;
  readonly dollSize: string;
  readonly colors: readonly string[];
  readonly tags: readonly string[];
  readonly imageUrl: string | undefined;
  readonly locationId: string | undefined;
  readonly status: string;
  readonly lastScannedAt: number;
  readonly confidenceDecayDays: number;
  readonly checkedOutAt: number | undefined;
  readonly createdAt: number;
  readonly updatedAt: number;
}): Promise<void> => {
  await db
    .prepare(
      `INSERT INTO garments (id, user_id, name, category, doll_size, colors, tags, image_url, location_id, status, last_scanned_at, confidence_decay_days, checked_out_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
    )
    .bind(
      id,
      userId,
      name,
      category,
      dollSize,
      JSON.stringify(colors),
      JSON.stringify(tags),
      imageUrl ?? null,
      locationId ?? null,
      status,
      lastScannedAt,
      confidenceDecayDays,
      checkedOutAt ?? null,
      createdAt,
      updatedAt,
    )
    .run()
    .catch(wrapDbError("create garment"));
};

export const updateGarmentFields = async ({
  db,
  id,
  userId,
  fields,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
  readonly fields: {
    readonly name?: string;
    readonly category?: string;
    readonly dollSize?: string;
    readonly colors?: readonly string[];
    readonly tags?: readonly string[];
    readonly imageUrl?: string;
    readonly locationId?: string;
    readonly confidenceDecayDays?: number;
  };
}): Promise<Garment | undefined> => {
  const fieldCandidates: readonly FieldCandidate[] = [
    { column: "name", value: fields.name },
    { column: "category", value: fields.category },
    { column: "doll_size", value: fields.dollSize },
    {
      column: "colors",
      value:
        fields.colors !== undefined ? JSON.stringify(fields.colors) : undefined,
    },
    {
      column: "tags",
      value:
        fields.tags !== undefined ? JSON.stringify(fields.tags) : undefined,
    },
    { column: "image_url", value: fields.imageUrl },
    { column: "location_id", value: fields.locationId },
    { column: "confidence_decay_days", value: fields.confidenceDecayDays },
  ];

  const updates = fieldCandidates.filter(isDefinedField);

  const now = Date.now();
  const setClauses = [
    ...updates.map((f, i) => `${f.column} = ?${String(i + 1)}`),
    `updated_at = ?${String(updates.length + 1)}`,
  ];
  const setParams: ReadonlyArray<string | number> = [
    ...updates.map((f) => f.value),
    now,
  ];

  const sql = `UPDATE garments SET ${setClauses.join(", ")} WHERE id = ?${String(setParams.length + 1)} AND user_id = ?${String(setParams.length + 2)}`;
  const allParams = [...setParams, id, userId];

  await db
    .prepare(sql)
    .bind(...allParams)
    .run()
    .catch(wrapDbError("update garment"));

  const row = await db
    .prepare("SELECT * FROM garments WHERE id = ?1 AND user_id = ?2")
    .bind(id, userId)
    .first<GarmentRow>()
    .catch(wrapDbError("fetch updated garment"));

  if (row === null) {
    return undefined;
  }

  return toGarment(row);
};

export const deleteGarmentById = async ({
  db,
  id,
  userId,
}: {
  readonly db: D1Database;
  readonly id: string;
  readonly userId: string;
}): Promise<number> => {
  const result = await db
    .prepare("DELETE FROM garments WHERE id = ?1 AND user_id = ?2")
    .bind(id, userId)
    .run()
    .catch(wrapDbError("delete garment"));

  return result.meta.changes;
};

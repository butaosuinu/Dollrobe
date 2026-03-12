import type { Garment } from "../../../../src/types";

export const TEMP_USER_ID = "temp-user-001";

export type GarmentRow = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly category: string;
  readonly doll_size: string;
  readonly colors: string;
  readonly tags: string;
  readonly image_url: string | null;
  readonly location_id: string | null;
  readonly status: string;
  readonly last_scanned_at: number;
  readonly confidence_decay_days: number;
  readonly checked_out_at: number | null;
  readonly created_at: number;
  readonly updated_at: number;
};

export const toGarment = (row: GarmentRow): Garment => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  category: row.category as Garment["category"],
  dollSize: row.doll_size as Garment["dollSize"],
  colors: JSON.parse(row.colors) as readonly string[],
  tags: JSON.parse(row.tags) as readonly string[],
  imageUrl: row.image_url ?? undefined,
  locationId: row.location_id ?? undefined,
  status: row.status as Garment["status"],
  lastScannedAt: row.last_scanned_at,
  confidenceDecayDays: row.confidence_decay_days,
  checkedOutAt: row.checked_out_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

import type { DollSize, GarmentCategory, GarmentStatus } from "@/types";

export const GARMENT_STATUS = Object.freeze({
  STORED: "stored",
  CHECKED_OUT: "checked_out",
  LOST: "lost",
} as const);

export const SYNC_STATUS = Object.freeze({
  IDLE: "idle",
  SYNCING: "syncing",
  ERROR: "error",
} as const);

export type SyncStatusValue = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

export const QR_SCHEME = Object.freeze({
  GARMENT_PREFIX: "dwg://g/",
  LOCATION_PREFIX: "dwg://l/",
});

export const CONFIDENCE_THRESHOLD = Object.freeze({
  CONFIRMED: 0.7,
  UNCERTAIN: 0.3,
});

export const DEFAULT_CONFIDENCE_DECAY_DAYS = 30;
export const SEASONAL_CONFIDENCE_DECAY_DAYS = 90;

export const ORPHAN_CHECKOUT_THRESHOLD_DAYS = 3;

export const MS_PER_DAY = 86_400_000;

export const SYNC_ACTION_TYPE = Object.freeze({
  GARMENT_CREATE: "garment:create",
  GARMENT_UPDATE: "garment:update",
  GARMENT_DELETE: "garment:delete",
  STORAGE_CASE_CREATE: "storageCase:create",
  STORAGE_LOCATION_CREATE: "storageLocation:create",
});

export const GARMENT_CATEGORIES: readonly GarmentCategory[] = [
  "tops",
  "bottoms",
  "dress",
  "outer",
  "shoes",
  "accessory",
  "other",
];

export type ConfidenceFilterValue =
  | "all"
  | "confirmed"
  | "uncertain"
  | "unknown";

export type SortOptionValue =
  | "newest"
  | "oldest"
  | "confidence_asc"
  | "confidence_desc";

export const DOLL_SIZES: readonly DollSize[] = [
  "1/3",
  "MSD",
  "SD",
  "YoSD",
  "1/6",
  "other",
];

export const GARMENT_STATUSES: readonly GarmentStatus[] = [
  "stored",
  "checked_out",
  "lost",
];

export const TOP_BAR_HEIGHT = 56;
export const BOTTOM_NAV_HEIGHT = 64;

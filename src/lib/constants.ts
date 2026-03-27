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
  STORAGE_CASE_UPDATE: "storageCase:update",
  STORAGE_CASE_DELETE: "storageCase:delete",
  STORAGE_LOCATION_CREATE: "storageLocation:create",
  STORAGE_LOCATION_UPDATE: "storageLocation:update",
  DOLL_CREATE: "doll:create",
  DOLL_UPDATE: "doll:update",
  DOLL_DELETE: "doll:delete",
});

export const STORAGE_CASE_TYPE = Object.freeze({
  GRID: "grid",
  UNIT: "unit",
} as const);

export type StorageCaseType =
  (typeof STORAGE_CASE_TYPE)[keyof typeof STORAGE_CASE_TYPE];

export const STORAGE_CASE_TYPES: readonly StorageCaseType[] = ["grid", "unit"];

export const CASE_NAME_MAX_LENGTH = 100;
export const CASE_DESCRIPTION_MAX_LENGTH = 200;
export const LOCATION_CUSTOM_NAME_MAX_LENGTH = 50;
export const LOCATION_DESCRIPTION_MAX_LENGTH = 200;
export const DOLL_NAME_MAX_LENGTH = 100;
export const DOLL_MEMO_MAX_LENGTH = 500;
export const GRID_SIZE_MIN = 1;
export const GRID_SIZE_MAX = 20;

export const GARMENT_CATEGORIES: readonly GarmentCategory[] = [
  "tops",
  "bottoms",
  "onepiece",
  "dress",
  "set",
  "outer",
  "underwear",
  "socks",
  "shoes",
  "hat",
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
  "SD",
  "SD13",
  "SD17",
  "MSD",
  "YoSD",
  "DD",
  "DDdy",
  "DDS",
  "DDP",
  "MDD",
  "other",
];

export const GARMENT_STATUSES: readonly GarmentStatus[] = [
  "stored",
  "checked_out",
  "lost",
];

export const ORPHAN_RESOLUTION = Object.freeze({
  STORED_BACK: "stored_back",
  STILL_USING: "still_using",
  LOST: "lost",
} as const);

export type OrphanResolution =
  (typeof ORPHAN_RESOLUTION)[keyof typeof ORPHAN_RESOLUTION];

export const NFC_SCAN_COOLDOWN_MS = 2000;
export const VIBRATION_DURATION_MS = 100;

export const TOP_BAR_HEIGHT = 56;
export const BOTTOM_NAV_HEIGHT = 64;

export const IMAGE_UPLOAD = Object.freeze({
  MAX_UPLOAD_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_INPUT_SIZE_BYTES: 50 * 1024 * 1024,
  ALLOWED_INPUT_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
  ] as const,
  ALLOWED_UPLOAD_MIME_TYPES: ["image/png"] as const,
});

export const IMAGE_COMPRESSION = Object.freeze({
  MAX_DIMENSION: 1200,
  OUTPUT_FORMAT: "image/png",
});

export const CSV_IMPORT = Object.freeze({
  CHUNK_SIZE: 50,
  PIPE_SEPARATOR: "|",
  REQUIRED_HEADERS: ["name", "category", "dollSize"] as const,
  ALL_HEADERS: [
    "name",
    "category",
    "dollSize",
    "colors",
    "tags",
    "brand",
    "confidenceDecayDays",
  ] as const,
});

export const BULK_CAPTURE = Object.freeze({
  MAX_COUNT: 30,
  CAPTURE_RESOLUTION: 1200,
  OUTPUT_FORMAT: "image/png",
  FLASH_DURATION_MS: 150,
});

export const MIME_TO_EXTENSION = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const);

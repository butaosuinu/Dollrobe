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

export const GARMENT_CATEGORY_LABEL = Object.freeze({
  tops: "トップス",
  bottoms: "ボトムス",
  dress: "ドレス",
  outer: "アウター",
  shoes: "シューズ",
  accessory: "アクセサリー",
  other: "その他",
} as const);

export const DOLL_SIZE_LABEL = Object.freeze({
  "1/3": "1/3 (SD17/DD等)",
  MSD: "MSD (1/4)",
  SD: "SD (1/3)",
  YoSD: "YoSD (1/6)",
  "1/6": "1/6 (ピュアニーモ等)",
  other: "その他",
} as const);

export const GARMENT_STATUS_LABEL = Object.freeze({
  stored: "収納中",
  checked_out: "取り出し中",
  lost: "紛失",
} as const);

export const CONFIDENCE_LABEL_TEXT = Object.freeze({
  confirmed: "確定",
  uncertain: "要確認",
  unknown: "不明",
} as const);

export const CONFIDENCE_DECAY_OPTIONS = Object.freeze([
  { value: 14, label: "よく着る服 (14日)" },
  { value: 30, label: "通常 (30日)" },
  { value: 90, label: "季節物 (90日)" },
] as const);

export const GARMENT_CATEGORIES: readonly GarmentCategory[] = [
  "tops",
  "bottoms",
  "dress",
  "outer",
  "shoes",
  "accessory",
  "other",
];

export const CONFIDENCE_FILTER_OPTIONS = Object.freeze([
  { value: "all", label: "すべて" },
  { value: "confirmed", label: "確定" },
  { value: "uncertain", label: "要確認" },
  { value: "unknown", label: "不明" },
] as const);

export type ConfidenceFilterValue =
  (typeof CONFIDENCE_FILTER_OPTIONS)[number]["value"];

export const SORT_OPTIONS = Object.freeze([
  { value: "newest", label: "新しい順" },
  { value: "oldest", label: "古い順" },
  { value: "confidence_asc", label: "信頼度: 低い順" },
  { value: "confidence_desc", label: "信頼度: 高い順" },
] as const);

export type SortOptionValue = (typeof SORT_OPTIONS)[number]["value"];

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

import { msg } from "@lingui/core/macro";
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
  tops: msg`トップス`,
  bottoms: msg`ボトムス`,
  dress: msg`ドレス`,
  outer: msg`アウター`,
  shoes: msg`シューズ`,
  accessory: msg`アクセサリー`,
  other: msg`その他`,
});

export const DOLL_SIZE_LABEL = Object.freeze({
  "1/3": msg`1/3 (SD17/DD等)`,
  MSD: msg`MSD (1/4)`,
  SD: msg`SD (1/3)`,
  YoSD: msg`YoSD (1/6)`,
  "1/6": msg`1/6 (ピュアニーモ等)`,
  other: msg`その他`,
});

export const GARMENT_STATUS_LABEL = Object.freeze({
  stored: msg`収納中`,
  checked_out: msg`取り出し中`,
  lost: msg`紛失`,
});

export const CONFIDENCE_LABEL_TEXT = Object.freeze({
  confirmed: msg`確定`,
  uncertain: msg`要確認`,
  unknown: msg`不明`,
});

export const CONFIDENCE_DECAY_OPTIONS = Object.freeze([
  { value: 14, label: msg`よく着る服 (14日)` },
  { value: 30, label: msg`通常 (30日)` },
  { value: 90, label: msg`季節物 (90日)` },
]);

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
  { value: "all" as const, label: msg`すべて` },
  { value: "confirmed" as const, label: msg`確定` },
  { value: "uncertain" as const, label: msg`要確認` },
  { value: "unknown" as const, label: msg`不明` },
]);

export type ConfidenceFilterValue =
  | "all"
  | "confirmed"
  | "uncertain"
  | "unknown";

export const SORT_OPTIONS = Object.freeze([
  { value: "newest" as const, label: msg`新しい順` },
  { value: "oldest" as const, label: msg`古い順` },
  { value: "confidence_asc" as const, label: msg`信頼度: 低い順` },
  { value: "confidence_desc" as const, label: msg`信頼度: 高い順` },
]);

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

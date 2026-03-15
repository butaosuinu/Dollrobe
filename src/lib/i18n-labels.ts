import { msg } from "@lingui/core/macro";
import type {
  DollSize,
  GarmentCategory,
  GarmentStatus,
  ConfidenceLabel,
} from "@/types";

export const GARMENT_CATEGORY_LABEL = Object.freeze({
  tops: msg`トップス`,
  bottoms: msg`ボトムス`,
  dress: msg`ドレス`,
  outer: msg`アウター`,
  shoes: msg`シューズ`,
  accessory: msg`アクセサリー`,
  other: msg`その他`,
}) satisfies Record<GarmentCategory, ReturnType<typeof msg>>;

export const DOLL_SIZE_LABEL = Object.freeze({
  "1/3": msg`1/3 (SD17/DD等)`,
  MSD: msg`MSD (1/4)`,
  SD: msg`SD (1/3)`,
  YoSD: msg`YoSD (1/6)`,
  "1/6": msg`1/6 (ピュアニーモ等)`,
  other: msg`その他`,
}) satisfies Record<DollSize, ReturnType<typeof msg>>;

export const GARMENT_STATUS_LABEL = Object.freeze({
  stored: msg`収納中`,
  checked_out: msg`取り出し中`,
  lost: msg`紛失`,
}) satisfies Record<GarmentStatus, ReturnType<typeof msg>>;

export const CONFIDENCE_LABEL_TEXT = Object.freeze({
  confirmed: msg`確定`,
  uncertain: msg`要確認`,
  unknown: msg`不明`,
}) satisfies Record<ConfidenceLabel, ReturnType<typeof msg>>;

export const CONFIDENCE_DECAY_OPTIONS = Object.freeze([
  { value: 14, label: msg`よく着る服 (14日)` },
  { value: 30, label: msg`通常 (30日)` },
  { value: 90, label: msg`季節物 (90日)` },
]);

export const CONFIDENCE_FILTER_OPTIONS = Object.freeze([
  { value: "all" as const, label: msg`すべて` },
  { value: "confirmed" as const, label: msg`確定` },
  { value: "uncertain" as const, label: msg`要確認` },
  { value: "unknown" as const, label: msg`不明` },
]);

export const SORT_OPTIONS = Object.freeze([
  { value: "newest" as const, label: msg`新しい順` },
  { value: "oldest" as const, label: msg`古い順` },
  { value: "confidence_asc" as const, label: msg`信頼度: 低い順` },
  { value: "confidence_desc" as const, label: msg`信頼度: 高い順` },
]);

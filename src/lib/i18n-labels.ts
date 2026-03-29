import { msg } from "@lingui/core/macro";
import { DOLL_SIZES } from "@/lib/constants";
import type {
  DollSize,
  GarmentCategory,
  GarmentStatus,
  ConfidenceLabel,
} from "@/types";

export const GARMENT_CATEGORY_LABEL = Object.freeze({
  tops: msg`トップス`,
  bottoms: msg`ボトムス`,
  onepiece: msg`ワンピース`,
  dress: msg`ドレス`,
  set: msg`セット`,
  outer: msg`アウター`,
  underwear: msg`インナー`,
  socks: msg`ソックス/タイツ`,
  shoes: msg`シューズ`,
  hat: msg`帽子/ヘッドドレス`,
  wig: msg`ウィッグ`,
  accessory: msg`アクセサリー`,
  other: msg`その他`,
}) satisfies Record<GarmentCategory, ReturnType<typeof msg>>;

export const DOLL_SIZE_LABEL = Object.freeze({
  SD: msg`SD (~57cm)`,
  SD13: msg`SD13 (~57cm)`,
  SD17: msg`SD17 (~65cm)`,
  MSD: msg`MSD (~43cm)`,
  YoSD: msg`YoSD (~26cm)`,
  DD_S: msg`DD S胸 (~58cm)`,
  DD_M: msg`DD M胸 (~58cm)`,
  DD_L: msg`DD L胸 (~58cm)`,
  DDdy: msg`DDdy (~58cm)`,
  DDS: msg`DDS (~55cm)`,
  DDP: msg`DDP (~43.5cm)`,
  MDD_S: msg`MDD S胸 (~40cm)`,
  MDD_M: msg`MDD M胸 (~40cm)`,
  MDD_L: msg`MDD L胸 (~40cm)`,
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

export const DOLL_SIZE_FILTER_OPTIONS = Object.freeze([
  { value: "all" as const, label: msg`すべて` },
  ...DOLL_SIZES.map((size) => ({
    value: size,
    label: DOLL_SIZE_LABEL[size],
  })),
]);

export const SORT_OPTIONS = Object.freeze([
  { value: "newest" as const, label: msg`新しい順` },
  { value: "oldest" as const, label: msg`古い順` },
  { value: "confidence_asc" as const, label: msg`信頼度: 低い順` },
  { value: "confidence_desc" as const, label: msg`信頼度: 高い順` },
]);

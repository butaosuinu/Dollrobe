import type { DollSize, GarmentCategory } from "@/types";
import { GARMENT_CATEGORIES, DOLL_SIZES } from "@/lib/constants";

export const isGarmentCategory = (value: string): value is GarmentCategory =>
  GARMENT_CATEGORIES.some((c) => c === value);

export const isDollSize = (value: string): value is DollSize =>
  DOLL_SIZES.some((s) => s === value);

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

import type { DollSize, GarmentCategory } from "@/types";
import { DOLL_SIZE_LABEL, GARMENT_CATEGORY_LABEL } from "@/lib/constants";

export const isGarmentCategory = (value: string): value is GarmentCategory =>
  Object.hasOwn(GARMENT_CATEGORY_LABEL, value);

export const isDollSize = (value: string): value is DollSize =>
  Object.hasOwn(DOLL_SIZE_LABEL, value);

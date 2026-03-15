import type { Garment, StorageCase, StorageLocation } from "@/types";

export const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

export const createTestGarment = (
  overrides: Partial<Garment> = {},
): Garment => ({
  id: "garment-1",
  userId: "user-1",
  name: "テストドレス",
  category: "dress",
  dollSize: "1/3",
  colors: [],
  tags: [],
  imageUrl: undefined,
  locationId: undefined,
  status: "stored",
  lastScannedAt: FIXED_NOW,
  confidenceDecayDays: 30,
  checkedOutAt: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

export const createTestStorageCase = (
  overrides: Partial<StorageCase> = {},
): StorageCase => ({
  id: "case-1",
  userId: "user-1",
  name: "衣装ケース A",
  rows: 3,
  cols: 3,
  createdAt: FIXED_NOW,
  ...overrides,
});

export const createTestStorageLocation = (
  overrides: Partial<StorageLocation> = {},
): StorageLocation => ({
  id: "loc-1",
  userId: "user-1",
  caseId: "case-1",
  label: "A-1",
  row: 0,
  col: 0,
  createdAt: FIXED_NOW,
  ...overrides,
});

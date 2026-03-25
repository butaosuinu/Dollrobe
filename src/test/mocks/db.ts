import { factory, primaryKey, nullable } from "@mswjs/data";
import type { DollSize, GarmentCategory, GarmentStatus } from "@/types";

export const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

export const testDb = factory({
  garment: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "テストドレス",
    category: (): GarmentCategory => "dress",
    dollSize: (): DollSize => "SD",
    colors: (): string[] => [],
    tags: (): string[] => [],
    imageUrl: nullable((): string | null => null),
    locationId: nullable((): string | null => null),
    status: (): GarmentStatus => "stored",
    lastScannedAt: () => FIXED_NOW,
    confidenceDecayDays: () => 30,
    brand: nullable((): string | null => null),
    checkedOutAt: nullable((): number | null => null),
    createdAt: () => FIXED_NOW,
    updatedAt: () => FIXED_NOW,
  },
  storageCase: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "衣装ケース A",
    rows: () => 3,
    cols: () => 3,
    createdAt: () => FIXED_NOW,
  },
  storageLocation: {
    id: primaryKey(String),
    userId: () => "user-1",
    caseId: () => "case-1",
    label: () => "A-1",
    row: () => 0,
    col: () => 0,
    createdAt: () => FIXED_NOW,
  },
});

export const resetTestDb = (): void => {
  testDb.garment.deleteMany({ where: {} });
  testDb.storageCase.deleteMany({ where: {} });
  testDb.storageLocation.deleteMany({ where: {} });
};

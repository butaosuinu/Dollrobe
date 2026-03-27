import { factory, primaryKey, nullable } from "@mswjs/data";
import type { DollSize, GarmentCategory, GarmentStatus } from "@/types";

export const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

export const testDb = factory({
  doll: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "テストドール",
    headModel: nullable((): string | null => null),
    bodySize: (): DollSize => "SD",
    imageUrl: nullable((): string | null => null),
    memo: nullable((): string | null => null),
    createdAt: () => FIXED_NOW,
    updatedAt: () => FIXED_NOW,
  },
  garment: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "テストドレス",
    category: (): GarmentCategory => "dress",
    dollSizes: (): DollSize[] => ["SD"],
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
  testDb.doll.deleteMany({ where: {} });
  testDb.garment.deleteMany({ where: {} });
  testDb.storageCase.deleteMany({ where: {} });
  testDb.storageLocation.deleteMany({ where: {} });
};

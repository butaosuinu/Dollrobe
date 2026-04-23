import { factory, primaryKey, nullable } from "@mswjs/data";
import type {
  DollSize,
  GarmentCategory,
  GarmentStatus,
  StorageCaseType,
} from "@/types";

export const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

export const testDb = factory({
  doll: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "テストドール",
    headModel: nullable((): string | null => null),
    bodySize: (): DollSize => "SD",
    maker: nullable((): string | null => null),
    customizer: nullable((): string | null => null),
    imageUrl: nullable((): string | null => null),
    memo: nullable((): string | null => null),
    archivedAt: nullable((): number | null => null),
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
    confidenceDecayDaysOverride: nullable((): number | null => 30),
    recentCheckoutCount: () => 0,
    brand: nullable((): string | null => null),
    checkedOutAt: nullable((): number | null => null),
    archivedAt: nullable((): number | null => null),
    createdAt: () => FIXED_NOW,
    updatedAt: () => FIXED_NOW,
  },
  storageCase: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "衣装ケース A",
    type: (): StorageCaseType => "grid",
    description: nullable((): string | null => null),
    rows: () => 3,
    cols: () => 3,
    createdAt: () => FIXED_NOW,
  },
  storageLocation: {
    id: primaryKey(String),
    userId: () => "user-1",
    caseId: () => "case-1",
    label: () => "A-1",
    customName: nullable((): string | null => null),
    description: nullable((): string | null => null),
    row: () => 0,
    col: () => 0,
    lastVisitedAt: nullable((): number | null => null),
    confirmAllCount: () => 0,
    correctionCount: () => 0,
    createdAt: () => FIXED_NOW,
  },
  coordinate: {
    id: primaryKey(String),
    userId: () => "user-1",
    name: () => "テストコーデ",
    garmentIds: (): string[] => [],
    isAiGenerated: (): boolean => false,
    memo: nullable((): string | null => null),
    createdAt: () => FIXED_NOW,
    updatedAt: () => FIXED_NOW,
  },
});

export const resetTestDb = (): void => {
  testDb.doll.deleteMany({ where: {} });
  testDb.garment.deleteMany({ where: {} });
  testDb.storageCase.deleteMany({ where: {} });
  testDb.storageLocation.deleteMany({ where: {} });
  testDb.coordinate.deleteMany({ where: {} });
};

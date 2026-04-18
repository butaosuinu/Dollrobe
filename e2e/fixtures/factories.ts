import type {
  Garment,
  Doll,
  StorageCase,
  StorageLocation,
} from "../../src/types/index";

const TEMP_USER_ID = "temp-user-001";
const FIXED_NOW = new Date("2025-06-15T00:00:00Z").getTime();

export const createGarment = (overrides: Partial<Garment> = {}): Garment => ({
  id: "garment-1",
  userId: TEMP_USER_ID,
  name: "テストドレス",
  category: "dress",
  dollSizes: ["SD"],
  colors: [],
  tags: [],
  imageUrl: undefined,
  locationId: undefined,
  status: "stored",
  lastScannedAt: FIXED_NOW,
  confidenceDecayDays: 30,
  brand: undefined,
  description: undefined,
  setContents: undefined,
  checkedOutAt: undefined,
  archivedAt: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

export const createDoll = (overrides: Partial<Doll> = {}): Doll => ({
  id: "doll-1",
  userId: TEMP_USER_ID,
  name: "テストドール",
  headModel: undefined,
  bodySize: "SD",
  maker: undefined,
  customizer: undefined,
  imageUrl: undefined,
  memo: undefined,
  archivedAt: undefined,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
  ...overrides,
});

export const createStorageCase = (
  overrides: Partial<StorageCase> = {},
): StorageCase => ({
  id: "case-1",
  userId: TEMP_USER_ID,
  name: "衣装ケース A",
  type: "grid",
  description: undefined,
  rows: 3,
  cols: 3,
  createdAt: FIXED_NOW,
  ...overrides,
});

export const createStorageLocation = (
  overrides: Partial<StorageLocation> = {},
): StorageLocation => ({
  id: "loc-1",
  userId: TEMP_USER_ID,
  caseId: "case-1",
  label: "A-1",
  customName: undefined,
  description: undefined,
  row: 0,
  col: 0,
  lastVisitedAt: undefined,
  createdAt: FIXED_NOW,
  ...overrides,
});

export { TEMP_USER_ID, FIXED_NOW };

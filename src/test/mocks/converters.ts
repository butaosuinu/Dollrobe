import type {
  Coordinate,
  Doll,
  Garment,
  StorageCase,
  StorageLocation,
} from "@/types";
import { testDb } from "@/test/mocks/db";

export const nullToUndefined = <T>(value: T | null): T | undefined =>
  value ?? undefined;

export const undefinedToNull = <T>(value: T | undefined): T | null =>
  value ?? null;

type RawDoll = ReturnType<typeof testDb.doll.getAll>[number];
type RawGarment = ReturnType<typeof testDb.garment.getAll>[number];
type RawStorageCase = ReturnType<typeof testDb.storageCase.getAll>[number];
type RawStorageLocation = ReturnType<
  typeof testDb.storageLocation.getAll
>[number];
type RawCoordinate = ReturnType<typeof testDb.coordinate.getAll>[number];

export const toDoll = (raw: RawDoll): Doll => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  headModel: nullToUndefined(raw.headModel),
  bodySize: raw.bodySize,
  maker: nullToUndefined(raw.maker),
  customizer: nullToUndefined(raw.customizer),
  imageUrl: nullToUndefined(raw.imageUrl),
  memo: nullToUndefined(raw.memo),
  archivedAt: nullToUndefined(raw.archivedAt),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toGarment = (raw: RawGarment): Garment => ({
  ...raw,
  imageUrl: nullToUndefined(raw.imageUrl),
  locationId: nullToUndefined(raw.locationId),
  confidenceDecayDaysOverride: nullToUndefined(raw.confidenceDecayDaysOverride),
  brand: nullToUndefined(raw.brand),
  description: undefined,
  setContents: undefined,
  checkedOutAt: nullToUndefined(raw.checkedOutAt),
  archivedAt: nullToUndefined(raw.archivedAt),
});

export const toStorageCase = (raw: RawStorageCase): StorageCase => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  type: raw.type,
  description: nullToUndefined(raw.description),
  rows: raw.rows,
  cols: raw.cols,
  createdAt: raw.createdAt,
});

export const toStorageLocation = (
  raw: RawStorageLocation,
): StorageLocation => ({
  id: raw.id,
  userId: raw.userId,
  caseId: raw.caseId,
  label: raw.label,
  customName: nullToUndefined(raw.customName),
  description: nullToUndefined(raw.description),
  row: raw.row,
  col: raw.col,
  lastVisitedAt: nullToUndefined(raw.lastVisitedAt),
  confirmAllCount: raw.confirmAllCount,
  correctionCount: raw.correctionCount,
  createdAt: raw.createdAt,
});

export const toCoordinate = (raw: RawCoordinate): Coordinate => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  garmentIds: raw.garmentIds,
  isAiGenerated: raw.isAiGenerated,
  memo: nullToUndefined(raw.memo),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

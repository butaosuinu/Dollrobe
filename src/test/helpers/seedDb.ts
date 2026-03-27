import { db } from "@/lib/db/dexie";
import { testDb } from "@/test/mocks/db";
import type { Doll, Garment, StorageCase, StorageLocation } from "@/types";

const nullToUndefined = <T>(value: T | null): T | undefined =>
  value ?? undefined;

const toDoll = (raw: ReturnType<typeof testDb.doll.getAll>[number]): Doll => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  headModel: nullToUndefined(raw.headModel),
  bodySize: raw.bodySize,
  maker: nullToUndefined(raw.maker),
  customizer: nullToUndefined(raw.customizer),
  imageUrl: nullToUndefined(raw.imageUrl),
  memo: nullToUndefined(raw.memo),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const toGarment = (
  raw: ReturnType<typeof testDb.garment.getAll>[number],
): Garment => ({
  ...raw,
  imageUrl: nullToUndefined(raw.imageUrl),
  locationId: nullToUndefined(raw.locationId),
  brand: nullToUndefined(raw.brand),
  checkedOutAt: nullToUndefined(raw.checkedOutAt),
});

const toStorageCase = (
  raw: ReturnType<typeof testDb.storageCase.getAll>[number],
): StorageCase => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  rows: raw.rows,
  cols: raw.cols,
  createdAt: raw.createdAt,
});

const toStorageLocation = (
  raw: ReturnType<typeof testDb.storageLocation.getAll>[number],
): StorageLocation => ({
  id: raw.id,
  userId: raw.userId,
  caseId: raw.caseId,
  label: raw.label,
  row: raw.row,
  col: raw.col,
  createdAt: raw.createdAt,
});

export const seedDbFromTestDb = async (): Promise<void> => {
  const dolls = testDb.doll.getAll().map(toDoll);
  const garments = testDb.garment.getAll().map(toGarment);
  const cases = testDb.storageCase.getAll().map(toStorageCase);
  const locations = testDb.storageLocation.getAll().map(toStorageLocation);

  if (dolls.length > 0) await db.dolls.bulkAdd([...dolls]);
  if (garments.length > 0) await db.garments.bulkAdd([...garments]);
  if (cases.length > 0) await db.storageCases.bulkAdd([...cases]);
  if (locations.length > 0) await db.storageLocations.bulkAdd([...locations]);
};

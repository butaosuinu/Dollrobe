import { getDb } from "@/lib/db/dexie";
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
  archivedAt: nullToUndefined(raw.archivedAt),
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const toGarment = (
  raw: ReturnType<typeof testDb.garment.getAll>[number],
): Garment => ({
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

const toStorageCase = (
  raw: ReturnType<typeof testDb.storageCase.getAll>[number],
): StorageCase => ({
  id: raw.id,
  userId: raw.userId,
  name: raw.name,
  type: raw.type,
  description: nullToUndefined(raw.description),
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
  customName: nullToUndefined(raw.customName),
  description: nullToUndefined(raw.description),
  row: raw.row,
  col: raw.col,
  lastVisitedAt: nullToUndefined(raw.lastVisitedAt),
  confirmAllCount: raw.confirmAllCount,
  correctionCount: raw.correctionCount,
  createdAt: raw.createdAt,
});

export const seedDbFromTestDb = async (): Promise<void> => {
  const dolls = testDb.doll.getAll().map(toDoll);
  const garments = testDb.garment.getAll().map(toGarment);
  const cases = testDb.storageCase.getAll().map(toStorageCase);
  const locations = testDb.storageLocation.getAll().map(toStorageLocation);

  const d = getDb();
  await (dolls.length > 0 ? d.dolls.bulkAdd([...dolls]) : Promise.resolve());
  await (garments.length > 0
    ? d.garments.bulkAdd([...garments])
    : Promise.resolve());
  await (cases.length > 0
    ? d.storageCases.bulkAdd([...cases])
    : Promise.resolve());
  await (locations.length > 0
    ? d.storageLocations.bulkAdd([...locations])
    : Promise.resolve());
};

import { getDb } from "@/lib/db/dexie";
import { testDb } from "@/test/mocks/db";
import {
  toCoordinate,
  toDoll,
  toGarment,
  toStorageCase,
  toStorageLocation,
} from "@/test/mocks/converters";

export const seedDbFromTestDb = async (): Promise<void> => {
  const dolls = testDb.doll.getAll().map(toDoll);
  const garments = testDb.garment.getAll().map(toGarment);
  const cases = testDb.storageCase.getAll().map(toStorageCase);
  const locations = testDb.storageLocation.getAll().map(toStorageLocation);
  const coordinates = testDb.coordinate.getAll().map(toCoordinate);

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
  await (coordinates.length > 0
    ? d.coordinates.bulkAdd([...coordinates])
    : Promise.resolve());
};

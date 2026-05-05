import { testDb } from "@/test/mocks/db";
import {
  toCoordinate,
  toDoll,
  toGarment,
  toStorageCase,
  toStorageLocation,
} from "@/test/mocks/converters";
import {
  registerDefaultMutation,
  registerDefaultQuery,
} from "./handlerFactory";

const allGarments = () => testDb.garment.getAll().map(toGarment);
const allDolls = () => testDb.doll.getAll().map(toDoll);
const allStorageCases = () => testDb.storageCase.getAll().map(toStorageCase);
const allStorageLocations = () =>
  testDb.storageLocation.getAll().map(toStorageLocation);
const allCoordinates = () => testDb.coordinate.getAll().map(toCoordinate);

export const registerDefaultTrpcHandlers = (): void => {
  registerDefaultQuery("garment.list", () => allGarments());

  registerDefaultQuery("doll.list", () => allDolls());

  registerDefaultQuery("location.listCases", () => ({
    cases: allStorageCases(),
  }));

  registerDefaultQuery("coordinate.list", () => allCoordinates());

  registerDefaultQuery("digest.hasUnread", () => ({ hasUnread: false }));
  registerDefaultQuery("digest.list", () => []);
  registerDefaultQuery("digest.latest", () => undefined);

  registerDefaultQuery("sync.pull", () => ({
    garments: allGarments(),
    storageCases: allStorageCases(),
    storageLocations: allStorageLocations(),
    dolls: allDolls(),
    coordinates: allCoordinates(),
  }));

  registerDefaultMutation("sync.push", () => ({
    success: true as const,
    processedCount: 0,
  }));
};

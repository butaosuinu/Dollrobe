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

  // admin 系: テストでは空の安全なデフォルトを返し、必要な検証は trpcQuery /
  // trpcMutation の override で個別に上書きする。
  registerDefaultQuery("admin.users.list", () => ({ items: [], total: 0 }));
  registerDefaultQuery("admin.users.detail", () => ({
    id: "user-default",
    name: "デフォルトユーザー",
    email: "default@example.com",
    emailVerified: false,
    image: undefined,
    role: "user" as const,
    frozen: false,
    createdAt: 0,
    updatedAt: 0,
  }));
  registerDefaultQuery("admin.metrics.summary", () => ({
    totalUsers: 0,
    frozenUsers: 0,
    totalGarments: 0,
    totalCoordinates: 0,
    totalLocations: 0,
    signupsLast7d: 0,
  }));
  registerDefaultQuery("admin.audits.list", () => ({ items: [], total: 0 }));
  registerDefaultQuery("admin.userDataView.garments", () => ({
    items: [],
    total: 0,
  }));
  registerDefaultQuery("admin.userDataView.locations", () => []);
  registerDefaultQuery("admin.userDataView.coordinates", () => ({
    items: [],
    total: 0,
  }));

  registerDefaultMutation("admin.users.freeze", () => ({
    ok: true as const,
    noop: false,
  }));
  registerDefaultMutation("admin.users.unfreeze", () => ({
    ok: true as const,
    noop: false,
  }));
};

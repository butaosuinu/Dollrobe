import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./mocks/server";
import { resetTestDb } from "./mocks/db";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();

  resetTestDb();

  const { db } = await import("@/lib/db/dexie");
  await db.garments.clear();
  await db.storageCases.clear();
  await db.storageLocations.clear();
  await db.coordinates.clear();
  await db.syncQueue.clear();
});

afterAll(() => {
  server.close();
});

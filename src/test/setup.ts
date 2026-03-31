import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";
import { resetTestDb } from "./mocks/db";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    readonly count: number;
    readonly estimateSize: () => number;
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        key: String(i),
        index: i,
        start: i * estimateSize(),
        size: estimateSize(),
      })),
    scrollToIndex: () => undefined,
    measureElement: () => undefined,
  }),
}));

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();

  resetTestDb();

  const { getDb } = await import("@/lib/db/dexie");
  const db = getDb();
  await db.dolls.clear();
  await db.garments.clear();
  await db.storageCases.clear();
  await db.storageLocations.clear();
  await db.coordinates.clear();
  await db.syncQueue.clear();
});

afterAll(() => {
  server.close();
});

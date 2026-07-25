import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { aroundAll, aroundEach, vi } from "vitest";
import { server } from "./mocks/server";
import { resetTestDb } from "./mocks/db";
import { clearTrpcOverrides } from "./mocks/trpc/handlerFactory";
import { restoreInstalledProperties } from "./helpers/propertyMock";

const navMod = await vi.hoisted(
  async () => await import("./mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("./mocks/modules/nextLink"),
);
const nfcRdrMod = await vi.hoisted(
  async () => await import("./mocks/modules/useNfcReader"),
);
const colorMod = await vi.hoisted(
  async () => await import("./mocks/modules/useColorExtraction"),
);
const jsqrMod = await vi.hoisted(
  async () => await import("./mocks/modules/jsqr"),
);
const authClientMod = await vi.hoisted(
  async () => await import("./mocks/modules/authClient"),
);

vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);
vi.mock("@/lib/image/compressImage", () => ({
  compressImage: vi.fn(
    async ({ file }: { readonly file: File }) =>
      await Promise.resolve({ file, width: 100, height: 100 }),
  ),
}));
vi.mock("@/hooks/useNfcReader", nfcRdrMod.useNfcReaderFactory);
vi.mock("@/hooks/useColorExtraction", colorMod.useColorExtractionFactory);
vi.mock("jsqr", jsqrMod.jsqrFactory);
vi.mock("@/lib/auth", authClientMod.authClientFactory);

aroundAll(async (runSuite) => {
  server.listen({ onUnhandledRequest: "error" });
  await runSuite();
  server.close();
});

aroundEach(async (runTest) => {
  await runTest();

  cleanup();
  server.resetHandlers();
  clearTrpcOverrides();
  restoreInstalledProperties();

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

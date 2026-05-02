import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./mocks/server";
import { resetTestDb } from "./mocks/db";
import { clearTrpcOverrides } from "./mocks/trpc/handlerFactory";
import { restoreCanvasMocks } from "./helpers/canvas";

const navMod = await vi.hoisted(
  async () => await import("./mocks/modules/nextNavigation"),
);
const linkMod = await vi.hoisted(
  async () => await import("./mocks/modules/nextLink"),
);
const cuidMod = await vi.hoisted(
  async () => await import("./mocks/modules/cuid2"),
);
const uploadMod = await vi.hoisted(
  async () => await import("./mocks/modules/useImageUpload"),
);
const nfcSupMod = await vi.hoisted(
  async () => await import("./mocks/modules/useNfcSupported"),
);
const nfcRdrMod = await vi.hoisted(
  async () => await import("./mocks/modules/useNfcReader"),
);
const colorMod = await vi.hoisted(
  async () => await import("./mocks/modules/useColorExtraction"),
);
const brandMod = await vi.hoisted(
  async () => await import("./mocks/modules/useBrandSuggestions"),
);
const onlineMod = await vi.hoisted(
  async () => await import("./mocks/modules/useOnlineSync"),
);
const jsqrMod = await vi.hoisted(
  async () => await import("./mocks/modules/jsqr"),
);

vi.mock("next/navigation", navMod.nextNavigationFactory);
vi.mock("next/link", linkMod.nextLinkFactory);
vi.mock("@paralleldrive/cuid2", cuidMod.cuid2Factory);
vi.mock("@/hooks/useImageUpload", uploadMod.useImageUploadFactory);
vi.mock("@/hooks/useNfcSupported", nfcSupMod.useNfcSupportedFactory);
vi.mock("@/hooks/useNfcReader", nfcRdrMod.useNfcReaderFactory);
vi.mock("@/hooks/useColorExtraction", colorMod.useColorExtractionFactory);
vi.mock("@/hooks/useBrandSuggestions", brandMod.useBrandSuggestionsFactory);
vi.mock("@/hooks/useOnlineSync", onlineMod.useOnlineSyncFactory);
vi.mock("jsqr", jsqrMod.jsqrFactory);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  cleanup();
  server.resetHandlers();
  clearTrpcOverrides();
  restoreCanvasMocks();

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

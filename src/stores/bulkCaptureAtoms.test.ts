import { describe, expect, it } from "vitest";
import { createStore } from "jotai";
import type { BulkCaptureItem, BulkCaptureMetadata } from "@/types";
import {
  addCapturedItemAtom,
  bulkCaptureStepAtom,
  capturedItemsAtom,
  currentMetadataIndexAtom,
  getMetadataForItem,
  metadataMapAtom,
  removeCapturedItemAtom,
  resetBulkCaptureSessionAtom,
  setMetadataAtom,
} from "@/stores/bulkCaptureAtoms";

const makeItem = (id: string): BulkCaptureItem => ({
  captureId: id,
  blob: new Blob([id], { type: "image/png" }),
  thumbnailUrl: `blob:${id}`,
  capturedAt: 1,
});

const makeMetadata = (captureId: string): BulkCaptureMetadata => ({
  captureId,
  name: `n-${captureId}`,
  category: "dress",
  dollSize: "MSD",
  colors: [],
  tags: [],
  brand: "",
  confidenceDecayDays: 30,
});

describe("bulkCaptureAtoms", () => {
  it("addCapturedItemAtom で末尾に追加される", () => {
    const store = createStore();
    store.set(addCapturedItemAtom, makeItem("c-1"));
    store.set(addCapturedItemAtom, makeItem("c-2"));
    const items = store.get(capturedItemsAtom);
    expect(items.map((i) => i.captureId)).toEqual(["c-1", "c-2"]);
  });

  it("removeCapturedItemAtom で対象のみ削除される", () => {
    const store = createStore();
    store.set(addCapturedItemAtom, makeItem("c-1"));
    store.set(addCapturedItemAtom, makeItem("c-2"));
    store.set(removeCapturedItemAtom, "c-1");
    const items = store.get(capturedItemsAtom);
    expect(items.map((i) => i.captureId)).toEqual(["c-2"]);
  });

  it("setMetadataAtom で metadata Map に保存される", () => {
    const store = createStore();
    const m = makeMetadata("c-1");
    store.set(setMetadataAtom, m);
    expect(store.get(metadataMapAtom).get("c-1")).toEqual(m);
  });

  it("setMetadataAtom で同じ captureId は上書きされる", () => {
    const store = createStore();
    store.set(setMetadataAtom, makeMetadata("c-1"));
    const updated = { ...makeMetadata("c-1"), name: "updated" };
    store.set(setMetadataAtom, updated);
    expect(store.get(metadataMapAtom).get("c-1")?.name).toBe("updated");
  });

  it("resetBulkCaptureSessionAtom で全状態がリセットされる", () => {
    const store = createStore();
    store.set(addCapturedItemAtom, makeItem("c-1"));
    store.set(setMetadataAtom, makeMetadata("c-1"));
    store.set(currentMetadataIndexAtom, 5);
    store.set(bulkCaptureStepAtom, "metadata");

    store.set(resetBulkCaptureSessionAtom);

    expect(store.get(capturedItemsAtom)).toEqual([]);
    expect(store.get(metadataMapAtom).size).toBe(0);
    expect(store.get(currentMetadataIndexAtom)).toBe(0);
    expect(store.get(bulkCaptureStepAtom)).toBe("capture");
  });

  it("getMetadataForItem は未登録ならデフォルト値を返す", () => {
    const map = new Map<string, BulkCaptureMetadata>();
    const result = getMetadataForItem(map, "c-x");
    expect(result.captureId).toBe("c-x");
    expect(result.name).toBe("");
    expect(result.category).toBe("tops");
    expect(result.dollSize).toBe("SD");
  });

  it("getMetadataForItem は登録済みなら保存済み値を返す", () => {
    const map = new Map<string, BulkCaptureMetadata>([
      ["c-1", makeMetadata("c-1")],
    ]);
    const result = getMetadataForItem(map, "c-1");
    expect(result.name).toBe("n-c-1");
  });
});

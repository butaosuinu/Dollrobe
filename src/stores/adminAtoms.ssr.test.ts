/**
 * @vitest-environment node
 */

// SSR (Node 環境) で `typeof window === "undefined"` 経路を確認するテスト。
// happy-dom 配下の他テストでは window が常に定義されるため、別 file で node
// 環境を指定して fallback 分岐 (adminAtoms.ts の各 atom 冒頭の if) を
// 明示的にカバーする。
//
// このファイルは src/test/setup.ts (vitest config の setupFiles) が読み込む
// fake-indexeddb / @testing-library/jest-dom などの jsdom 依存を持つため、
// global setup の代わりに必要な module のみ単独で import する。

import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import {
  adminAuditsAtom,
  adminMetricsAtom,
  adminUserCoordinatesAtomFamily,
  adminUserDetailAtomFamily,
  adminUserGarmentsAtomFamily,
  adminUserLocationsAtomFamily,
  adminUsersAtom,
} from "./adminAtoms";

describe("adminAtoms SSR fallback (node 環境)", () => {
  it("adminMetricsAtom は EMPTY_METRICS を返す", async () => {
    const store = createStore();
    const value = await store.get(adminMetricsAtom);
    expect(value).toEqual({
      totalUsers: 0,
      frozenUsers: 0,
      totalGarments: 0,
      totalCoordinates: 0,
      totalLocations: 0,
      signupsLast7d: 0,
    });
  });

  it("adminUsersAtom は空の検索結果を返す", async () => {
    const store = createStore();
    const value = await store.get(adminUsersAtom);
    expect(value).toEqual({ items: [], total: 0 });
  });

  it("adminUserDetailAtomFamily は undefined を返す", async () => {
    const store = createStore();
    const value = await store.get(adminUserDetailAtomFamily("u-1"));
    expect(value).toBeUndefined();
  });

  it("adminAuditsAtom は空の監査ログを返す", async () => {
    const store = createStore();
    const value = await store.get(adminAuditsAtom);
    expect(value).toEqual({ items: [], total: 0 });
  });

  it("adminUserGarmentsAtomFamily は空配列を返す", async () => {
    const store = createStore();
    const value = await store.get(adminUserGarmentsAtomFamily("u-1", 0));
    expect(value).toEqual({ items: [], total: 0 });
  });

  it("adminUserCoordinatesAtomFamily は空配列を返す", async () => {
    const store = createStore();
    const value = await store.get(adminUserCoordinatesAtomFamily("u-1", 0));
    expect(value).toEqual({ items: [], total: 0 });
  });

  it("adminUserLocationsAtomFamily は空配列を返す", async () => {
    const store = createStore();
    const value = await store.get(adminUserLocationsAtomFamily("u-1"));
    expect(value).toEqual([]);
  });
});

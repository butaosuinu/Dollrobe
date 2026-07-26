/**
 * @vitest-environment node
 */

// SSR で session を fetch すると、サーバプロセス全体で共有される jotai default
// store に解決済み state が残り、2 回目以降の SSR だけ isLoading: false の HTML
// を返して hydration mismatch になる (#213)。happy-dom 配下の他テストでは window
// が常に定義されるため、別 file で node 環境を指定してこの分岐をカバーする。

import { describe, it, expect } from "vitest";
import { createStore } from "jotai";
import {
  authSessionAtom,
  authSessionUnwrappedAtom,
  currentUserIdAtom,
} from "./authAtoms";

const PENDING_AUTH_STATE = {
  user: undefined,
  isAuthenticated: false,
  isLoading: true,
  hasError: false,
};

describe("authAtoms SSR fallback (node 環境)", () => {
  it("authSessionAtom は session を fetch せず pending state を返す", async () => {
    const store = createStore();

    await expect(store.get(authSessionAtom)).resolves.toEqual(
      PENDING_AUTH_STATE,
    );
  });

  it("同一 store を使い回しても authSessionUnwrappedAtom の値は変わらない", async () => {
    // 1 リクエスト目の SSR 相当
    const store = createStore();
    const firstRender = store.get(authSessionUnwrappedAtom);

    await store.get(authSessionAtom);
    await Promise.resolve();

    // 2 リクエスト目の SSR 相当。store が共有されていても pending のまま
    const secondRender = store.get(authSessionUnwrappedAtom);

    expect(firstRender).toEqual(PENDING_AUTH_STATE);
    expect(secondRender).toEqual(firstRender);
  });

  it("currentUserIdAtom は undefined を返す", async () => {
    const store = createStore();
    await store.get(authSessionAtom);
    await Promise.resolve();

    expect(store.get(currentUserIdAtom)).toBeUndefined();
  });
});

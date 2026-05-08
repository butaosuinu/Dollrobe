import { act } from "@testing-library/react";

/**
 * Dexie 書き込み・jotai async atom の解決・React state 更新が連鎖する
 * テストで、microtask キューを段階的に flush するためのユーティリティ。
 * 3 回で Dexie → atom resolve → React reconciliation を吸収できる。
 */
export const flushPromises = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

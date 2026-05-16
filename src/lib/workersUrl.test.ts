import { afterEach, describe, expect, it, vi } from "vitest";

// 各テストで env を入れ替えるため、毎回 module を再評価する。
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("workersUrl", () => {
  it("NEXT_PUBLIC_WORKERS_URL が設定されているとそれが使われる", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORKERS_URL", "https://api.example.com");
    const mod = await import("@/lib/workersUrl");
    expect(mod.WORKERS_URL).toBe("https://api.example.com");
    expect(mod.WORKERS_URL_FOR_FETCH).toBe("https://api.example.com");
  });

  it("NEXT_PUBLIC_WORKERS_URL が空文字のときデフォルト URL を使う", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORKERS_URL", "");
    const mod = await import("@/lib/workersUrl");
    expect(mod.WORKERS_URL).toBe("http://localhost:8787");
    // WORKERS_URL_FOR_FETCH は window 不在 (SSR) ならデフォルト、存在時は ""
    if (typeof window === "undefined") {
      expect(mod.WORKERS_URL_FOR_FETCH).toBe("http://localhost:8787");
    } else {
      expect(mod.WORKERS_URL_FOR_FETCH).toBe("");
    }
  });

  it("NEXT_PUBLIC_WORKERS_URL 未定義でもデフォルト URL を使う", async () => {
    vi.stubEnv("NEXT_PUBLIC_WORKERS_URL", undefined as unknown as string);
    const mod = await import("@/lib/workersUrl");
    expect(mod.WORKERS_URL).toBe("http://localhost:8787");
  });
});

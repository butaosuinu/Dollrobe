import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

type ObserverCb = (entries: ReadonlyArray<{ isIntersecting: boolean }>) => void;

type Observer = {
  readonly cb: ObserverCb;
  readonly observe: ReturnType<typeof vi.fn>;
  readonly disconnect: ReturnType<typeof vi.fn>;
};

const observers: Observer[] = [];

const installIntersectionObserver = (): readonly Observer[] => {
  observers.splice(0, observers.length);

  const FakeIO = function (this: unknown, cb: ObserverCb) {
    const observe = vi.fn();
    const disconnect = vi.fn();
    observers.push({ cb, observe, disconnect });
    return {
      observe,
      disconnect,
      unobserve: vi.fn(),
      takeRecords: vi.fn(() => []),
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test global setup
  (globalThis as any).IntersectionObserver = FakeIO;

  return observers;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useFadeInOnView", () => {
  it("初期 className は opacity-0", () => {
    installIntersectionObserver();
    const { result } = renderHook(() => useFadeInOnView());
    expect(result.current.className).toContain("opacity-0");
  });

  it("ref が null のときは observe が起動しない", () => {
    const list = installIntersectionObserver();
    renderHook(() => useFadeInOnView());
    expect(list.length).toBe(0);
  });

  it("isIntersecting=false の reading では opacity-0 のまま", () => {
    const list = installIntersectionObserver();
    const node = document.createElement("div");

    const { result } = renderHook(() => {
      const r = useFadeInOnView();
      Object.assign(r.ref, { current: node });
      return r;
    });

    const last = list.at(-1);
    if (last !== undefined) {
      act(() => {
        last.cb([{ isIntersecting: false }]);
      });
    }
    expect(result.current.className).toContain("opacity-0");
  });

  it("style.transition プロパティを含む style を返す", () => {
    installIntersectionObserver();
    const { result } = renderHook(() => useFadeInOnView());
    expect(result.current.style.transition).toContain("opacity 600ms");
  });
});

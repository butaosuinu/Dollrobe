import { describe, it, expect, afterEach } from "vitest";
import { isNfcSupported } from "./capability";

describe("isNfcSupported", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "NDEFReader");
  });

  it("NDEFReader が存在する場合 true を返す", () => {
    Object.defineProperty(window, "NDEFReader", {
      value: true,
      writable: true,
      configurable: true,
    });
    expect(isNfcSupported()).toBe(true);
  });

  it("NDEFReader が存在しない場合 false を返す", () => {
    Reflect.deleteProperty(globalThis, "NDEFReader");
    expect(isNfcSupported()).toBe(false);
  });
});

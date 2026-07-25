import { describe, it, expect, vi, afterEach, aroundEach } from "vitest";
import { buildNfcScheme, isNfcSupported, writeNfcTag } from "./writer";

const mockWrite = vi.fn();

describe("isNfcSupported", () => {
  afterEach(() => {
    // biome-ignore lint: test cleanup requires delete
    delete (globalThis as Record<string, unknown>).NDEFReader;
  });

  it("NDEFReaderが未定義の場合falseを返す", () => {
    expect(isNfcSupported()).toBe(false);
  });

  it("NDEFReaderが定義されている場合trueを返す", () => {
    (globalThis as Record<string, unknown>).NDEFReader = vi.fn();
    expect(isNfcSupported()).toBe(true);
  });
});

describe("buildNfcScheme", () => {
  it("garmentタイプでdwg://g/プレフィックスのURIを返す", () => {
    expect(buildNfcScheme({ type: "garment", id: "abc-123" })).toBe(
      "dwg://g/abc-123",
    );
  });

  it("locationタイプでdwg://l/プレフィックスのURIを返す", () => {
    expect(buildNfcScheme({ type: "location", id: "loc-456" })).toBe(
      "dwg://l/loc-456",
    );
  });
});

function buildNdefReaderInstance(): { readonly write: typeof mockWrite } {
  return { write: mockWrite };
}

describe("writeNfcTag", () => {
  aroundEach(async (runTest) => {
    mockWrite.mockReset();
    (globalThis as Record<string, unknown>).NDEFReader = vi.fn(
      buildNdefReaderInstance,
    );

    await runTest();

    // biome-ignore lint: test cleanup requires delete
    delete (globalThis as Record<string, unknown>).NDEFReader;
  });

  it("NFC非対応の場合not_supportedエラーを返す", async () => {
    // biome-ignore lint: test cleanup requires delete
    delete (globalThis as Record<string, unknown>).NDEFReader;

    const result = await writeNfcTag({ scheme: "dwg://g/test-1" });

    expect(result).toStrictEqual({
      ok: false,
      errorKind: "not_supported",
      message: "Web NFC API is not supported on this device",
    });
  });

  it("書き込み成功時にok:trueを返す", async () => {
    mockWrite.mockResolvedValueOnce(undefined);

    const result = await writeNfcTag({ scheme: "dwg://g/test-1" });

    expect(result).toStrictEqual({ ok: true });
    expect(mockWrite).toHaveBeenCalledWith(
      { records: [{ recordType: "url", data: "dwg://g/test-1" }] },
      { signal: undefined },
    );
  });

  it("NotAllowedErrorでpermission_deniedエラーを返す", async () => {
    mockWrite.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    const result = await writeNfcTag({ scheme: "dwg://g/test-1" });

    expect(result).toStrictEqual({
      ok: false,
      errorKind: "permission_denied",
      message: "Permission denied",
    });
  });

  it("AbortErrorでabortedエラーを返す", async () => {
    mockWrite.mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const result = await writeNfcTag({ scheme: "dwg://g/test-1" });

    expect(result).toStrictEqual({
      ok: false,
      errorKind: "aborted",
      message: "The operation was aborted",
    });
  });

  it("その他のエラーでwrite_failedエラーを返す", async () => {
    mockWrite.mockRejectedValueOnce(new Error("Tag is not writable"));

    const result = await writeNfcTag({ scheme: "dwg://g/test-1" });

    expect(result).toStrictEqual({
      ok: false,
      errorKind: "write_failed",
      message: "Tag is not writable",
    });
  });

  it("signalをNDEFReader.writeに渡す", async () => {
    mockWrite.mockResolvedValueOnce(undefined);
    const controller = new AbortController();

    await writeNfcTag({
      scheme: "dwg://l/loc-1",
      signal: controller.signal,
    });

    expect(mockWrite).toHaveBeenCalledWith(
      { records: [{ recordType: "url", data: "dwg://l/loc-1" }] },
      { signal: controller.signal },
    );
  });
});

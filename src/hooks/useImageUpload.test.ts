import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImageUpload } from "./useImageUpload";
import { compressImage } from "@/lib/image/compressImage";
import { IMAGE_UPLOAD } from "@/lib/constants";

vi.mock("@/lib/image/compressImage", () => ({
  compressImage: vi.fn(),
}));

const PNG_MIME = "image/png";
const JPEG_MIME = "image/jpeg";
const INVALID_MIME = "application/pdf";
const COMPRESSED_FILE_NAME = "compressed.png";
const COMPRESSED_WIDTH = 100;
const COMPRESSED_HEIGHT = 200;
const SUCCESS_IMAGE_URL = "https://example.com/uploads/abc.png";
const TEST_GARMENT_ID = "garment-1";

const createTestFile = ({
  type = PNG_MIME,
  size = 1024,
  name = "test.png",
}: {
  readonly type?: string;
  readonly size?: number;
  readonly name?: string;
} = {}): File => {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
};

const createJsonResponse = ({
  status,
  body,
}: {
  readonly status: number;
  readonly body: string;
}): Response =>
  new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createTextResponse = ({
  status,
  body,
}: {
  readonly status: number;
  readonly body: string;
}): Response =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/plain" },
  });

describe("useImageUpload", () => {
  const compressImageMock = vi.mocked(compressImage);

  beforeEach(() => {
    compressImageMock.mockReset();
    compressImageMock.mockResolvedValue({
      file: new File([new ArrayBuffer(512)], COMPRESSED_FILE_NAME, {
        type: PNG_MIME,
      }),
      width: COMPRESSED_WIDTH,
      height: COMPRESSED_HEIGHT,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態は idle", () => {
    const { result } = renderHook(() => useImageUpload());
    expect(result.current.uploadState).toEqual({ status: "idle" });
  });

  it("許可されない MIME タイプの場合は error 状態にして throw する", async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: INVALID_MIME });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow(`許可されていないファイル形式です: ${INVALID_MIME}`);
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: `許可されていないファイル形式です: ${INVALID_MIME}`,
    });
    expect(compressImageMock).not.toHaveBeenCalled();
  });

  it("ファイルサイズ上限超過の場合は error 状態にして throw する", async () => {
    const { result } = renderHook(() => useImageUpload());
    const oversize = IMAGE_UPLOAD.MAX_INPUT_SIZE_BYTES + 1;
    const file = createTestFile({ type: JPEG_MIME, size: oversize });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow("ファイルサイズが上限 (50MB) を超えています");
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: "ファイルサイズが上限 (50MB) を超えています",
    });
    expect(compressImageMock).not.toHaveBeenCalled();
  });

  it("圧縮 → アップロード → 成功で imageUrl を返し success 状態になる", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        createJsonResponse({
          status: 200,
          body: JSON.stringify({ imageUrl: SUCCESS_IMAGE_URL }),
        }),
      );

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    let returnedUrl = "";
    await act(async () => {
      returnedUrl = await result.current.upload({
        file,
        garmentId: TEST_GARMENT_ID,
      });
    });

    expect(returnedUrl).toBe(SUCCESS_IMAGE_URL);
    expect(result.current.uploadState).toEqual({
      status: "success",
      imageUrl: SUCCESS_IMAGE_URL,
    });
    expect(compressImageMock).toHaveBeenCalledWith({ file });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchSpy.mock.calls[0];
    expect(fetchCall).toBeDefined();
    expect(fetchCall?.[0]).toContain(`/api/images/upload/${TEST_GARMENT_ID}`);
    const init = fetchCall?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("fetch のネットワークエラー時に error 状態にして throw する", async () => {
    const networkError = new Error("network down");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(networkError);

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow("network down");
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: "アップロードに失敗しました",
    });
  });

  it("response.ok=false かつ JSON パース成功時はエラー本文を表示する", async () => {
    const errorMessage = "ファイルサイズが大きすぎます";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createJsonResponse({
        status: 400,
        body: JSON.stringify({ error: errorMessage }),
      }),
    );

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow(errorMessage);
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: errorMessage,
    });
  });

  it("response.ok=false かつ JSON パース成功でも error フィールドが無い場合はデフォルトメッセージを表示する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createJsonResponse({ status: 500, body: JSON.stringify({}) }),
    );

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow("アップロードに失敗しました");
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: "アップロードに失敗しました",
    });
  });

  it("response.ok=true でも uploadResponseSchema のパースに失敗すると error 状態にして throw する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createJsonResponse({
        status: 200,
        body: JSON.stringify({ wrong: "shape" }),
      }),
    );

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    await act(async () => {
      await expect(
        result.current.upload({ file, garmentId: TEST_GARMENT_ID }),
      ).rejects.toThrow("不正なレスポンス形式です");
    });

    expect(result.current.uploadState).toEqual({
      status: "error",
      message: "不正なレスポンス形式です",
    });
  });

  it("reset() は AbortController を abort して idle に戻す", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");

    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_input, init) => {
        capturedSignal =
          init?.signal instanceof AbortSignal ? init.signal : undefined;
        return createJsonResponse({
          status: 200,
          body: JSON.stringify({ imageUrl: SUCCESS_IMAGE_URL }),
        });
      },
    );

    const { result } = renderHook(() => useImageUpload());
    const file = createTestFile({ type: JPEG_MIME });

    await act(async () => {
      await result.current.upload({ file, garmentId: TEST_GARMENT_ID });
    });

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal?.aborted).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(abortSpy).toHaveBeenCalled();
    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.uploadState).toEqual({ status: "idle" });
  });

  it("upload を一度も実行していない状態で reset() を呼んでも idle になる", () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    const { result } = renderHook(() => useImageUpload());

    act(() => {
      result.current.reset();
    });

    expect(abortSpy).not.toHaveBeenCalled();
    expect(result.current.uploadState).toEqual({ status: "idle" });
  });
});

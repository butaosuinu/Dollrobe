import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IMAGE_COMPRESSION, IMAGE_UPLOAD } from "@/lib/constants";
import {
  installCanvas2DContext,
  installCanvas2DContextNull,
  installCanvasToBlob,
} from "@/test/helpers/canvas";
import { compressImage } from "./compressImage";

vi.unmock("@/lib/image/compressImage");

const PNG_MIME = "image/png";
const JPEG_MIME = "image/jpeg";
const SMALL_FILE_BYTES = 1024;
const OVERSIZED_FILE_BYTES = IMAGE_UPLOAD.MAX_UPLOAD_SIZE_BYTES + 1;
const { MAX_DIMENSION: MAX_DIM } = IMAGE_COMPRESSION;

const createFakeFile = ({
  size,
  type,
}: {
  readonly size: number;
  readonly type: string;
}): File => {
  const file = new File(["x"], "input.bin", { type });
  Object.defineProperty(file, "size", { value: size, configurable: true });
  return file;
};

const stubCreateImageBitmap = ({
  width,
  height,
}: {
  readonly width: number;
  readonly height: number;
}): { readonly close: ReturnType<typeof vi.fn> } => {
  const close = vi.fn();
  const bitmap = { width, height, close };
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => {
      await Promise.resolve();
      return bitmap;
    }),
  );
  return { close };
};

const stubCanvas = ({
  ctxValue,
  blobValue,
}: {
  readonly ctxValue: "null" | "with-drawImage";
  readonly blobValue: Blob | null;
}) => {
  installCanvasToBlob(blobValue);
  if (ctxValue === "null") {
    const { getContext } = installCanvas2DContextNull();
    return { drawImage: undefined, getContext } as const;
  }
  const { ctx, getContext } = installCanvas2DContext();
  return { drawImage: ctx.drawImage, getContext } as const;
};

describe("compressImage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("変換不要パス", () => {
    it("PNG かつ寸法・サイズが上限以下の場合は元のファイルをそのまま返す", async () => {
      const { close } = stubCreateImageBitmap({ width: 800, height: 600 });
      const { getContext } = stubCanvas({
        ctxValue: "with-drawImage",
        blobValue: null,
      });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: PNG_MIME,
      });

      const result = await compressImage({ file });

      expect(result.file).toBe(file);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(close).toHaveBeenCalledTimes(1);
      expect(getContext).not.toHaveBeenCalled();
    });
  });

  describe("変換が必要なパス", () => {
    it("MIME が PNG 以外なら変換して PNG ファイルを返す", async () => {
      const { close } = stubCreateImageBitmap({ width: 800, height: 600 });
      const blob = new Blob(["compressed"], { type: PNG_MIME });
      const { drawImage } = stubCanvas({
        ctxValue: "with-drawImage",
        blobValue: blob,
      });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: JPEG_MIME,
      });

      const result = await compressImage({ file });

      expect(result.file).not.toBe(file);
      expect(result.file.type).toBe(PNG_MIME);
      expect(result.file.name).toBe("compressed.png");
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(drawImage).toHaveBeenCalledWith(
        expect.objectContaining({ width: 800, height: 600 }),
        0,
        0,
        800,
        600,
      );
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("幅が maxDimension を超える場合はアスペクト比を維持して縮小する", async () => {
      stubCreateImageBitmap({ width: 4000, height: 2000 });
      const blob = new Blob(["compressed"], { type: PNG_MIME });
      stubCanvas({ ctxValue: "with-drawImage", blobValue: blob });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: PNG_MIME,
      });

      const result = await compressImage({ file });

      expect(result.width).toBe(MAX_DIM);
      expect(result.height).toBe(600);
    });

    it("高さが maxDimension を超える場合もアスペクト比を維持して縮小する", async () => {
      stubCreateImageBitmap({ width: 2000, height: 4000 });
      const blob = new Blob(["compressed"], { type: PNG_MIME });
      stubCanvas({ ctxValue: "with-drawImage", blobValue: blob });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: PNG_MIME,
      });

      const result = await compressImage({ file });

      expect(result.width).toBe(600);
      expect(result.height).toBe(MAX_DIM);
    });

    it("ファイルサイズが MAX_UPLOAD_SIZE_BYTES を超える場合は変換する", async () => {
      stubCreateImageBitmap({ width: 800, height: 600 });
      const blob = new Blob(["compressed"], { type: PNG_MIME });
      const { drawImage } = stubCanvas({
        ctxValue: "with-drawImage",
        blobValue: blob,
      });

      const file = createFakeFile({
        size: OVERSIZED_FILE_BYTES,
        type: PNG_MIME,
      });

      const result = await compressImage({ file });

      expect(result.file).not.toBe(file);
      expect(result.file.type).toBe(PNG_MIME);
      expect(drawImage).toHaveBeenCalledTimes(1);
    });

    it("カスタム maxDimension を指定した場合はそれに従う", async () => {
      stubCreateImageBitmap({ width: 1000, height: 500 });
      const blob = new Blob(["compressed"], { type: PNG_MIME });
      stubCanvas({ ctxValue: "with-drawImage", blobValue: blob });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: PNG_MIME,
      });

      const result = await compressImage({ file, maxDimension: 500 });

      expect(result.width).toBe(500);
      expect(result.height).toBe(250);
    });
  });

  describe("エラーパス", () => {
    it("getContext が null を返した場合はエラーをスローし bitmap を閉じる", async () => {
      const { close } = stubCreateImageBitmap({ width: 4000, height: 2000 });
      stubCanvas({ ctxValue: "null", blobValue: null });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: JPEG_MIME,
      });

      await expect(compressImage({ file })).rejects.toThrow(
        "Failed to get canvas 2d context",
      );
      expect(close).toHaveBeenCalledTimes(1);
    });

    it("canvas.toBlob が null を返した場合は reject される", async () => {
      stubCreateImageBitmap({ width: 4000, height: 2000 });
      stubCanvas({ ctxValue: "with-drawImage", blobValue: null });

      const file = createFakeFile({
        size: SMALL_FILE_BYTES,
        type: JPEG_MIME,
      });

      await expect(compressImage({ file })).rejects.toThrow(
        "Canvas toBlob returned null",
      );
    });
  });
});

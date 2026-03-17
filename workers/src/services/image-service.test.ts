import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildR2Key,
  buildPublicUrl,
  extractR2KeyFromUrl,
  validateFile,
} from "./image-service";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("buildR2Key", () => {
  it("userId/garmentId/timestamp.png の形式で生成する", () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const key = buildR2Key({
      userId: "user-1",
      garmentId: "garment-1",
      mimeType: "image/png",
    });

    expect(key).toBe("garments/user-1/garment-1/1700000000000.png");
  });
});

describe("buildPublicUrl", () => {
  it("R2_PUBLIC_URL とキーを結合する", () => {
    const url = buildPublicUrl({
      r2PublicUrl: "https://cdn.example.com",
      key: "garments/user-1/garment-1/123.png",
    });

    expect(url).toBe(
      "https://cdn.example.com/garments/user-1/garment-1/123.png",
    );
  });

  it("末尾スラッシュ付きの URL でも正しく結合する", () => {
    const url = buildPublicUrl({
      r2PublicUrl: "https://cdn.example.com/",
      key: "garments/user-1/garment-1/123.png",
    });

    expect(url).toBe(
      "https://cdn.example.com/garments/user-1/garment-1/123.png",
    );
  });
});

describe("extractR2KeyFromUrl", () => {
  it("正常な URL からキーを抽出する", () => {
    const key = extractR2KeyFromUrl({
      r2PublicUrl: "https://cdn.example.com",
      imageUrl: "https://cdn.example.com/garments/user-1/garment-1/123.png",
    });

    expect(key).toBe("garments/user-1/garment-1/123.png");
  });

  it("末尾スラッシュ付きの URL でも正しく抽出する", () => {
    const key = extractR2KeyFromUrl({
      r2PublicUrl: "https://cdn.example.com/",
      imageUrl: "https://cdn.example.com/garments/user-1/garment-1/123.png",
    });

    expect(key).toBe("garments/user-1/garment-1/123.png");
  });

  it("異なるプレフィックスの URL で undefined を返す", () => {
    const key = extractR2KeyFromUrl({
      r2PublicUrl: "https://cdn.example.com",
      imageUrl: "https://other.example.com/garments/user-1/123.png",
    });

    expect(key).toBeUndefined();
  });
});

describe("validateFile", () => {
  it("PNG ファイルを受け入れる", () => {
    const result = validateFile({ size: 1024, mimeType: "image/png" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.validMimeType).toBe("image/png");
    }
  });

  it("JPEG ファイルを拒否する", () => {
    const result = validateFile({ size: 1024, mimeType: "image/jpeg" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("image/jpeg");
    }
  });

  it("WebP ファイルを拒否する", () => {
    const result = validateFile({ size: 1024, mimeType: "image/webp" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("image/webp");
    }
  });

  it("許可されていない MIME タイプでエラーになる", () => {
    const result = validateFile({ size: 1024, mimeType: "image/gif" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("image/gif");
    }
  });

  it("サイズ超過でエラーになる", () => {
    const result = validateFile({
      size: 6 * 1024 * 1024,
      mimeType: "image/png",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("5MB");
    }
  });

  it("ちょうど 5MB のファイルを受け入れる", () => {
    const result = validateFile({
      size: 5 * 1024 * 1024,
      mimeType: "image/png",
    });

    expect(result.ok).toBe(true);
  });
});

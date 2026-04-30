import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  R2Bucket,
  R2ObjectBody,
} from "@cloudflare/workers-types";
import { createLogger } from "../lib/logger";
import { uploadImage, getImage, deleteImage } from "./image-service";

const logger = createLogger({ minLevel: "error" });

type StubBucket = {
  readonly put: ReturnType<typeof vi.fn>;
  readonly get: ReturnType<typeof vi.fn>;
  readonly delete: ReturnType<typeof vi.fn>;
};

const buildStubBucket = (
  overrides: Partial<StubBucket> = {},
): { readonly bucket: R2Bucket; readonly stub: StubBucket } => {
  const stub: StubBucket = {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
  // R2Bucket は head/list/multipart 等もメソッドを持つが、
  // image-service が触るのは put/get/delete のみ。
  // テストスタブのため Object.assign で R2Bucket 型に投影する
  const bucket: R2Bucket = {
    put: stub.put,
    get: stub.get,
    delete: stub.delete,
    head: vi.fn(),
    list: vi.fn(),
    createMultipartUpload: vi.fn(),
    resumeMultipartUpload: vi.fn(),
  };
  return { bucket, stub };
};

const buildR2ObjectBody = ({
  body,
  contentType,
  httpEtag,
}: {
  readonly body: ArrayBuffer;
  readonly contentType: string | undefined;
  readonly httpEtag: string;
}): R2ObjectBody => {
  const httpMetadata = contentType !== undefined ? { contentType } : {};
  // R2ObjectBody の必要メソッドだけ揃えた object を返す
  const obj: R2ObjectBody = {
    key: "k",
    version: "v",
    size: body.byteLength,
    etag: httpEtag,
    httpEtag,
    checksums: { toJSON: () => ({}) },
    uploaded: new Date(),
    httpMetadata,
    customMetadata: {},
    storageClass: "Standard",
    range: undefined,
    body: undefined,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(body),
    text: () => Promise.resolve(""),
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
    writeHttpMetadata: () => undefined,
  };
  return obj;
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("uploadImage エラーパス", () => {
  it("R2.put が reject した場合 INTERNAL_ERROR を返す", async () => {
    const { bucket, stub } = buildStubBucket({
      put: vi.fn().mockRejectedValue(new Error("network down")),
    });

    const result = await uploadImage({
      bucket,
      key: "k1",
      body: new ArrayBuffer(8),
      mimeType: "image/png",
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.message).toBe("network down");
    }
    expect(stub.put).toHaveBeenCalledTimes(1);
  });

  it("R2.put が非 Error を reject した場合フォールバックメッセージを返す", async () => {
    const { bucket } = buildStubBucket({
      put: vi.fn().mockRejectedValue("string error"),
    });

    const result = await uploadImage({
      bucket,
      key: "k2",
      body: new ArrayBuffer(8),
      mimeType: "image/png",
      logger,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("R2 upload failed");
    }
  });

  it("正常系: R2.put が解決すると ok を返す", async () => {
    const { bucket, stub } = buildStubBucket({
      put: vi.fn().mockResolvedValue(undefined),
    });

    const result = await uploadImage({
      bucket,
      key: "k3",
      body: new ArrayBuffer(4),
      mimeType: "image/png",
      logger,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.key).toBe("k3");
    }
    expect(stub.put).toHaveBeenCalledWith("k3", expect.any(ArrayBuffer), {
      httpMetadata: { contentType: "image/png" },
    });
  });
});

describe("getImage エラーパス", () => {
  it("R2.get が reject した場合 INTERNAL_ERROR を返す", async () => {
    const { bucket } = buildStubBucket({
      get: vi.fn().mockRejectedValue(new Error("R2 down")),
    });

    const result = await getImage({ bucket, key: "k1", logger });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.message).toBe("R2 down");
    }
  });

  it("R2.get が非 Error を reject した場合フォールバックメッセージを返す", async () => {
    const { bucket } = buildStubBucket({
      get: vi.fn().mockRejectedValue(123),
    });

    const result = await getImage({ bucket, key: "k1", logger });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("R2 get failed");
    }
  });

  it("R2.get が null を返した場合 NOT_FOUND を返す", async () => {
    const { bucket } = buildStubBucket({
      get: vi.fn().mockResolvedValue(null),
    });

    const result = await getImage({ bucket, key: "missing", logger });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toBe("Image not found");
    }
  });

  it("httpMetadata?.contentType が undefined の場合 application/octet-stream にフォールバック", async () => {
    const body = new ArrayBuffer(16);
    const obj = buildR2ObjectBody({
      body,
      contentType: undefined,
      httpEtag: "etag-1",
    });
    const { bucket } = buildStubBucket({
      get: vi.fn().mockResolvedValue(obj),
    });

    const result = await getImage({ bucket, key: "k", logger });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contentType).toBe("application/octet-stream");
      expect(result.data.httpEtag).toBe("etag-1");
      expect(result.data.body).toBe(body);
    }
  });

  it("httpMetadata?.contentType が定義されていればそれを返す", async () => {
    const body = new ArrayBuffer(8);
    const obj = buildR2ObjectBody({
      body,
      contentType: "image/png",
      httpEtag: "etag-2",
    });
    const { bucket } = buildStubBucket({
      get: vi.fn().mockResolvedValue(obj),
    });

    const result = await getImage({ bucket, key: "k", logger });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contentType).toBe("image/png");
    }
  });
});

describe("deleteImage エラーパス", () => {
  it("R2.delete が reject した場合 INTERNAL_ERROR を返す", async () => {
    const { bucket } = buildStubBucket({
      delete: vi.fn().mockRejectedValue(new Error("delete failed")),
    });

    const result = await deleteImage({ bucket, key: "k1", logger });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL_ERROR");
      expect(result.error.message).toBe("delete failed");
    }
  });

  it("R2.delete が非 Error を reject した場合フォールバックメッセージを返す", async () => {
    const { bucket } = buildStubBucket({
      delete: vi.fn().mockRejectedValue(undefined),
    });

    const result = await deleteImage({ bucket, key: "k1", logger });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("R2 delete failed");
    }
  });

  it("正常系: 削除に成功する", async () => {
    const { bucket, stub } = buildStubBucket({
      delete: vi.fn().mockResolvedValue(undefined),
    });

    const result = await deleteImage({ bucket, key: "k1", logger });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.success).toBe(true);
    }
    expect(stub.delete).toHaveBeenCalledWith("k1");
  });
});

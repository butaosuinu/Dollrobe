import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import type { Auth } from "../auth";
import type { Logger } from "../lib/logger";
import { createLogger } from "../lib/logger";
import { imageRoutes } from "./image";
import { createId } from "@paralleldrive/cuid2";

type Variables = {
  auth: Auth;
  requestId: string;
  logger: Logger;
};

const errorSchema = z.object({ error: z.string() });
const imageUrlSchema = z.object({ imageUrl: z.string() });

const parseError = async (res: Response): Promise<string> => {
  const data = await res.json();
  return errorSchema.parse(data).error;
};

const parseImageUrl = async (res: Response): Promise<string> => {
  const data = await res.json();
  return imageUrlSchema.parse(data).imageUrl;
};

const buildApp = () => {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();
  app.use("*", async (c, next) => {
    c.set("logger", createLogger({ minLevel: "error" }));
    await next();
  });
  app.route("/api/images", imageRoutes);
  return app;
};

const buildMultipartRequest = ({
  garmentId,
  file,
}: {
  readonly garmentId: string;
  readonly file: File | undefined;
}): Request => {
  const form = new FormData();
  if (file !== undefined) {
    form.append("file", file);
  }
  return new Request(
    `http://localhost/api/images/upload/${garmentId}`,
    {
      method: "POST",
      body: form,
    },
  );
};

describe("imageRoutes /upload/:garmentId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("garmentId が空文字の場合 (ルート不一致) 404 を返す", async () => {
    const app = buildApp();
    const req = new Request("http://localhost/api/images/upload/", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=x" },
      body: "",
    });
    const res = await app.fetch(req, env);
    expect(res.status).toBe(404);
  });

  it("Content-Type が multipart/form-data でない場合 400 を返す", async () => {
    const app = buildApp();
    const garmentId = createId();
    const req = new Request(
      `http://localhost/api/images/upload/${garmentId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ foo: "bar" }),
      },
    );
    const res = await app.fetch(req, env);
    expect(res.status).toBe(400);
    const message = await parseError(res);
    expect(message).toContain("multipart/form-data");
  });

  it("file フィールドが欠落している場合 400 を返す", async () => {
    const app = buildApp();
    const garmentId = createId();
    const req = buildMultipartRequest({ garmentId, file: undefined });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const message = await parseError(res);
    expect(message).toBe("file field is required");
  });

  it("validateFile が失敗する MIME (image/gif) の場合 400 を返す", async () => {
    const app = buildApp();
    const garmentId = createId();
    const file = new File([new Uint8Array([1, 2, 3])], "x.gif", {
      type: "image/gif",
    });
    const req = buildMultipartRequest({ garmentId, file });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(400);
    const message = await parseError(res);
    expect(message).toContain("image/gif");
  });

  it("R2 への upload が失敗した場合 500 を返す", async () => {
    const app = buildApp();
    const garmentId = createId();
    const file = new File([new Uint8Array([1, 2, 3])], "x.png", {
      type: "image/png",
    });

    const putSpy = vi
      .spyOn(env.BUCKET, "put")
      .mockRejectedValue(new Error("R2 disconnected"));

    const req = buildMultipartRequest({ garmentId, file });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(500);
    const message = await parseError(res);
    expect(message).toBe("R2 disconnected");
    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it("正常系: R2 に put して imageUrl を返す", async () => {
    const app = buildApp();
    const garmentId = createId();
    const file = new File([new Uint8Array([10, 20, 30])], "x.png", {
      type: "image/png",
    });

    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const putSpy = vi.spyOn(env.BUCKET, "put");

    const req = buildMultipartRequest({ garmentId, file });
    const res = await app.fetch(req, env);

    expect(res.status).toBe(200);
    const url = await parseImageUrl(res);
    expect(url).toBe(
      `${env.R2_PUBLIC_URL}/garments/temp-user-001/${garmentId}/1700000000000.png`,
    );
    expect(putSpy).toHaveBeenCalledTimes(1);
    const firstCall = putSpy.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall?.[0]).toBe(
      `garments/temp-user-001/${garmentId}/1700000000000.png`,
    );
    expect(firstCall?.[2]).toEqual({
      httpMetadata: { contentType: "image/png" },
    });
  });
});

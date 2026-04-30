import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
  createScheduledController,
  createMessageBatch,
  getQueueResult,
} from "cloudflare:test";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import worker from "./index";
import { resetDatabase, getTestDb } from "./test/helpers";
import { createDrizzle } from "./db/client";
import * as digestService from "./services/digest-service";
import * as digestRepo from "./repositories/digest-repository";
import { garments } from "./db/schema";

type AuthSessionStub = { readonly user: { readonly id: string } };

vi.mock("./auth", () => {
  const handler = async (): Promise<Response> =>
    await Promise.resolve(new Response("auth disabled", { status: 501 }));
  const getSession = async (): Promise<AuthSessionStub | undefined> =>
    await Promise.resolve(undefined);
  return {
    createAuth: () => ({ handler, api: { getSession } }),
  };
});

const ALLOWED_ORIGIN = "http://localhost:3000";
const TEST_BASE = "http://test.local";
const TEST_CRON = "0 9 * * 1";
const TEST_QUEUE_NAME = "doll-wardrobe-digest";

const noop = (): void => {
  // intentional noop for spy implementation
};

const callWorker = async (
  request: Request,
  envOverride?: Partial<typeof env>,
): Promise<Response> => {
  const ctx = createExecutionContext();
  const mergedEnv = envOverride === undefined ? env : { ...env, ...envOverride };
  const response = await worker.fetch(request, mergedEnv, ctx);
  await waitOnExecutionContext(ctx);
  return response;
};

type ConsoleSpy = {
  readonly mock: { readonly calls: ReadonlyArray<readonly unknown[]> };
};

const consoleCallContains = (spy: ConsoleSpy, needle: string): boolean =>
  spy.mock.calls.some(
    ([first]) => typeof first === "string" && first.includes(needle),
  );

beforeEach(async () => {
  await resetDatabase(getTestDb());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Workers エントリ index.ts", () => {
  describe("/health", () => {
    it("GET /health は 200 と {status: ok} を返す", async () => {
      const response = await callWorker(
        new Request(`${TEST_BASE}/health`, { method: "GET" }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: "ok" });
    });
  });

  describe("/api/images/serve/*", () => {
    it("正常な key で 200 と Cache-Control / ETag ヘッダを返す", async () => {
      const key = "garments/serve-user/serve-garment/100.png";
      await env.BUCKET.put(key, new ArrayBuffer(8), {
        httpMetadata: { contentType: "image/png" },
      });

      const response = await callWorker(
        new Request(`${TEST_BASE}/api/images/serve/${key}`, { method: "GET" }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      expect(response.headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
      expect(response.headers.get("ETag")).not.toBeNull();
    });

    it("空 key (末尾スラッシュのみ) は 400 を返す", async () => {
      const response = await callWorker(
        new Request(`${TEST_BASE}/api/images/serve/`, { method: "GET" }),
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({ error: "Key is required" });
    });

    it("存在しない key は 404 を返す", async () => {
      const response = await callWorker(
        new Request(`${TEST_BASE}/api/images/serve/missing/key.png`, {
          method: "GET",
        }),
      );

      expect(response.status).toBe(404);
    });

    it("R2 が内部エラーを投げると 500 を返す", async () => {
      vi.spyOn(env.BUCKET, "get").mockImplementationOnce(async () =>
        await Promise.reject(new Error("R2 boom")),
      );

      const response = await callWorker(
        new Request(`${TEST_BASE}/api/images/serve/anything.png`, {
          method: "GET",
        }),
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body).toEqual({ error: "R2 boom" });
    });

    it("URL エンコードされた key を decode して取得する", async () => {
      const rawKey = "garments/space user/garment id/200.png";
      await env.BUCKET.put(rawKey, new ArrayBuffer(4), {
        httpMetadata: { contentType: "image/png" },
      });

      const encoded = rawKey
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

      const response = await callWorker(
        new Request(`${TEST_BASE}/api/images/serve/${encoded}`, {
          method: "GET",
        }),
      );

      expect(response.status).toBe(200);
    });
  });

  describe("CORS preflight", () => {
    it("ALLOWED_ORIGINS に含まれる Origin で preflight が許可される", async () => {
      const response = await callWorker(
        new Request(`${TEST_BASE}/health`, {
          method: "OPTIONS",
          headers: {
            Origin: ALLOWED_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type",
          },
        }),
      );

      expect(response.status).toBe(204);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        ALLOWED_ORIGIN,
      );
      expect(response.headers.get("Access-Control-Allow-Credentials")).toBe(
        "true",
      );
    });

    it("ALLOWED_ORIGINS の値を環境変数から取得し、別 origin を許可しない", async () => {
      const customOrigin = "https://custom.example.com";
      const response = await callWorker(
        new Request(`${TEST_BASE}/health`, {
          method: "OPTIONS",
          headers: {
            Origin: customOrigin,
            "Access-Control-Request-Method": "GET",
          },
        }),
        { ALLOWED_ORIGINS: customOrigin },
      );

      expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
        customOrigin,
      );
    });
  });

  describe("LOG_LEVEL の解釈", () => {
    const exerciseHealth = async (
      logLevelOverride: string | undefined,
    ): Promise<Response> => {
      const envOverride =
        logLevelOverride === undefined
          ? { LOG_LEVEL: undefined }
          : { LOG_LEVEL: logLevelOverride };
      return await callWorker(
        new Request(`${TEST_BASE}/health`, { method: "GET" }),
        envOverride,
      );
    };

    it.each(["debug", "info", "warn", "error"] as const)(
      "%s を指定すると 200 を返す",
      async (level) => {
        vi.spyOn(console, "log").mockImplementation(noop);
        vi.spyOn(console, "error").mockImplementation(noop);

        const response = await exerciseHealth(level);
        expect(response.status).toBe(200);
      },
    );

    it("不正値はデフォルト (info) として扱われる", async () => {
      vi.spyOn(console, "log").mockImplementation(noop);

      const response = await exerciseHealth("invalid-level");
      expect(response.status).toBe(200);
    });

    it("undefined もデフォルト (info) として扱われる", async () => {
      vi.spyOn(console, "log").mockImplementation(noop);

      const response = await exerciseHealth(undefined);
      expect(response.status).toBe(200);
    });
  });

  describe("tRPC onError ハンドラ", () => {
    it("存在しない procedure 呼出で 404 相当のエラーを返し error ログを出す", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(noop);
      vi.spyOn(console, "log").mockImplementation(noop);

      const response = await callWorker(
        new Request(`${TEST_BASE}/trpc/nonexistent.procedure`, {
          method: "GET",
        }),
      );

      expect(response.ok).toBe(false);
      expect(consoleCallContains(consoleError, "tRPC error")).toBe(true);
    });
  });

  describe("scheduled() ハンドラ", () => {
    it("ユーザー無しでも正常完了し info ログを出す", async () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(noop);

      const ctx = createExecutionContext();
      const controller = createScheduledController({
        scheduledTime: Date.now(),
        cron: TEST_CRON,
      });

      worker.scheduled(controller, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(consoleCallContains(consoleLog, "digest cron started")).toBe(true);
      expect(consoleCallContains(consoleLog, "digest cron completed")).toBe(
        true,
      );
    });

    it("findAllUserIds が返した userId 分だけ QUEUE.send を呼ぶ", async () => {
      const drizzleDb = createDrizzle(env.DB);
      const seedUserIds = ["sched-user-1", "sched-user-2"];
      const now = Date.now();
      await Promise.all(
        seedUserIds.map(async (id) => {
          await drizzleDb.insert(garments).values({
            id: `garment-${id}`,
            userId: id,
            name: `garment-${id}`,
            category: "dress",
            dollSizes: ["MSD"],
            colors: [],
            tags: [],
            imageUrl: undefined,
            locationId: undefined,
            status: "stored",
            lastScannedAt: now,
            confidenceDecayDays: 30,
            checkedOutAt: undefined,
            createdAt: now,
            updatedAt: now,
          });
        }),
      );

      const findSpy = vi.spyOn(digestRepo, "findAllUserIds");
      const sendSpy = vi.spyOn(env.QUEUE, "send");

      const ctx = createExecutionContext();
      const controller = createScheduledController({
        scheduledTime: Date.now(),
        cron: TEST_CRON,
      });

      worker.scheduled(controller, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(findSpy).toHaveBeenCalled();
      expect(sendSpy.mock.calls.length).toBeGreaterThanOrEqual(
        seedUserIds.length,
      );
    });
  });

  describe("queue() ハンドラ", () => {
    it("不明な message を受け取ると warn ログを出して ack する", async () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(noop);

      const batch = createMessageBatch(TEST_QUEUE_NAME, [
        {
          id: "msg-unknown",
          timestamp: new Date(),
          body: { type: "unknown" },
          attempts: 1,
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env);
      await waitOnExecutionContext(ctx);

      const result = await getQueueResult(batch, ctx);
      expect(result.outcome).toBe("ok");
      expect(consoleCallContains(consoleLog, "unknown queue message type")).toBe(
        true,
      );
    });

    it("正常な generate_digest メッセージを処理して digestService を呼ぶ", async () => {
      const userId = "queue-user-1";

      const generateSpy = vi
        .spyOn(digestService, "generateDigestForUser")
        .mockResolvedValue({
          ok: true,
          data: { digest: undefined, skipped: true },
        });

      const batch = createMessageBatch(TEST_QUEUE_NAME, [
        {
          id: "msg-ok",
          timestamp: new Date(),
          body: { type: "generate_digest", userId },
          attempts: 1,
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env);
      await waitOnExecutionContext(ctx);

      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ userId }),
      );
    });

    it("digestService が失敗すると retry が呼ばれる", async () => {
      vi.spyOn(console, "error").mockImplementation(noop);
      vi.spyOn(console, "log").mockImplementation(noop);

      vi.spyOn(digestService, "generateDigestForUser").mockResolvedValue({
        ok: false,
        error: { code: "INTERNAL_ERROR", message: "boom" },
      });

      const batch = createMessageBatch(TEST_QUEUE_NAME, [
        {
          id: "msg-fail",
          timestamp: new Date(),
          body: { type: "generate_digest", userId: "u-fail" },
          attempts: 1,
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env);
      await waitOnExecutionContext(ctx);

      const result = await getQueueResult(batch, ctx);
      const retried = result.retryMessages.some((m) => m.msgId === "msg-fail");
      expect(retried).toBe(true);
    });
  });
});

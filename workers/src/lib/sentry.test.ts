import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  buildSentryOptions,
  captureTrpcError,
  shouldCaptureTrpcError,
} from "./sentry";

const { captureExceptionMock, honoIntegrationMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(
    (_error: unknown, _options?: unknown): undefined => undefined,
  ),
  honoIntegrationMock: vi.fn((_options?: unknown) => ({
    name: "Hono",
    setupOnce: () => undefined,
  })),
}));

vi.mock("@sentry/cloudflare", () => ({
  captureException: (error: unknown, options?: unknown) => {
    captureExceptionMock(error, options);
  },
  honoIntegration: (options?: unknown) => honoIntegrationMock(options),
}));

afterEach(() => {
  captureExceptionMock.mockClear();
  honoIntegrationMock.mockClear();
});

describe("buildSentryOptions", () => {
  it("DSN が undefined のまま options に乗る (SDK 側で no-op になる前提)", () => {
    const options = buildSentryOptions({});

    expect(options.dsn).toBeUndefined();
    expect(options.tracesSampleRate).toBe(0.05);
    expect(options.integrations).toHaveLength(1);
  });

  it("SENTRY_ENVIRONMENT / SENTRY_RELEASE が未設定ならキーごと生やさない (SDK の自動解決に委ねる)", () => {
    const options = buildSentryOptions({});

    expect("environment" in options).toBe(false);
    expect("release" in options).toBe(false);
  });

  it("DSN / environment / release を env から拾う", () => {
    const options = buildSentryOptions({
      SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      SENTRY_ENVIRONMENT: "production",
      SENTRY_RELEASE: "abc1234",
    });

    expect(options.dsn).toBe("https://public@example.ingest.sentry.io/1");
    expect(options.environment).toBe("production");
    expect(options.release).toBe("abc1234");
  });
});

describe("shouldCaptureTrpcError", () => {
  it.each([
    ["BAD_REQUEST", false],
    ["UNAUTHORIZED", false],
    ["FORBIDDEN", false],
    ["NOT_FOUND", false],
    ["TOO_MANY_REQUESTS", false],
    ["INTERNAL_SERVER_ERROR", true],
    ["NOT_IMPLEMENTED", true],
    ["BAD_GATEWAY", true],
    ["SERVICE_UNAVAILABLE", true],
    ["GATEWAY_TIMEOUT", true],
  ] as const)("%s -> %s", (code, expected) => {
    expect(shouldCaptureTrpcError(code)).toBe(expected);
  });
});

describe("captureTrpcError", () => {
  it("4xx 系は Sentry へ送らない", () => {
    captureTrpcError({
      error: new TRPCError({ code: "BAD_REQUEST", message: "bad input" }),
      path: "garment.create",
    });
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("5xx 系は Sentry へ送る (cause があれば cause を優先)", () => {
    const cause = new Error("DB down");
    captureTrpcError({
      error: new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "boom",
        cause,
      }),
      path: "garment.list",
    });

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(cause, {
      tags: {
        trpc_procedure: "garment.list",
        trpc_code: "INTERNAL_SERVER_ERROR",
      },
    });
  });

  it("cause が無いときは TRPCError 自体を送る", () => {
    captureTrpcError({
      error: new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "boom" }),
      path: undefined,
    });

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [capturedError, captureOptions] =
      captureExceptionMock.mock.calls[0] ?? [];
    expect(capturedError).toBeInstanceOf(TRPCError);
    expect(captureOptions).toEqual({
      tags: {
        trpc_procedure: "<unknown>",
        trpc_code: "INTERNAL_SERVER_ERROR",
      },
    });
  });
});

import { env } from "cloudflare:test";
import type { Message, MessageBatch } from "@cloudflare/workers-types";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTestLogger } from "../test/helpers";
import { handleDigestQueue } from "./digest-consumer";
import * as digestService from "../services/digest-service";
import { serviceOk, serviceError } from "../services/types";

vi.mock("../services/digest-service", async () => {
  const actual = await vi.importActual<
    typeof import("../services/digest-service")
  >("../services/digest-service");
  return {
    ...actual,
    generateDigestForUser: vi.fn(),
  };
});

const mockedGenerate = vi.mocked(digestService.generateDigestForUser);

const logger = createTestLogger();

type StubMessage = Message & {
  readonly ack: ReturnType<typeof vi.fn>;
  readonly retry: ReturnType<typeof vi.fn>;
};

const buildMessage = (body: unknown): StubMessage => ({
  id: "msg-1",
  body,
  ack: vi.fn(),
  retry: vi.fn(),
  timestamp: new Date(),
  attempts: 1,
});

const buildBatch = (messages: readonly StubMessage[]): MessageBatch => ({
  queue: "digest",
  messages,
  ackAll: vi.fn(),
  retryAll: vi.fn(),
});

beforeEach(() => {
  mockedGenerate.mockReset();
});

describe("handleDigestQueue", () => {
  it("isDigestQueueMessage が false の場合 warn して ack する", async () => {
    const warnSpy = vi.spyOn(logger, "warn");
    const message = buildMessage({ type: "unknown" });
    const batch = buildBatch([message]);

    await handleDigestQueue({ batch, env, logger });

    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.retry).not.toHaveBeenCalled();
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "unknown queue message type",
      expect.objectContaining({ body: { type: "unknown" } }),
    );
  });

  it("body が record でない場合も warn して ack する", async () => {
    const message = buildMessage("not-an-object");
    const batch = buildBatch([message]);

    await handleDigestQueue({ batch, env, logger });

    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("type が generate_digest だが userId が無い場合も warn して ack する", async () => {
    const message = buildMessage({ type: "generate_digest" });
    const batch = buildBatch([message]);

    await handleDigestQueue({ batch, env, logger });

    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });

  it("result.ok が true の場合 ack する", async () => {
    mockedGenerate.mockResolvedValue(
      serviceOk({ digest: undefined, skipped: true }),
    );

    const message = buildMessage({
      type: "generate_digest",
      userId: "user-1",
    });
    const batch = buildBatch([message]);

    await handleDigestQueue({ batch, env, logger });

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1" }),
    );
    expect(message.ack).toHaveBeenCalledTimes(1);
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("result.ok が false の場合 retry する", async () => {
    mockedGenerate.mockResolvedValue(
      serviceError("INTERNAL_ERROR", "DB connection failed"),
    );

    const message = buildMessage({
      type: "generate_digest",
      userId: "user-2",
    });
    const batch = buildBatch([message]);

    await handleDigestQueue({ batch, env, logger });

    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(message.retry).toHaveBeenCalledTimes(1);
    expect(message.ack).not.toHaveBeenCalled();
  });

  it("複数メッセージを並行処理し、それぞれ独立に ack/retry する", async () => {
    mockedGenerate
      .mockResolvedValueOnce(serviceOk({ digest: undefined, skipped: true }))
      .mockResolvedValueOnce(serviceError("INTERNAL_ERROR", "fail"));

    const ok = buildMessage({ type: "generate_digest", userId: "user-ok" });
    const ng = buildMessage({ type: "generate_digest", userId: "user-ng" });
    const batch = buildBatch([ok, ng]);

    await handleDigestQueue({ batch, env, logger });

    expect(ok.ack).toHaveBeenCalledTimes(1);
    expect(ng.retry).toHaveBeenCalledTimes(1);
  });
});

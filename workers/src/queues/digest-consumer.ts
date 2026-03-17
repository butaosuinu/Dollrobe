import { createDrizzle } from "../db/client";
import type { Logger } from "../lib/logger";
import type { Env } from "../types";
import * as digestService from "../services/digest-service";
import type { DigestQueueMessage } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isDigestQueueMessage = (body: unknown): body is DigestQueueMessage => {
  if (!isRecord(body)) {
    return false;
  }
  return body.type === "generate_digest" && typeof body.userId === "string";
};

export const handleDigestQueue = async ({
  batch,
  env,
  logger,
}: {
  readonly batch: MessageBatch;
  readonly env: Env;
  readonly logger: Logger;
}): Promise<void> => {
  const drizzleDb = createDrizzle(env.DB);

  await Promise.all(
    batch.messages.map(async (msg) => {
      if (!isDigestQueueMessage(msg.body)) {
        logger.warn("unknown queue message type", { body: msg.body });
        msg.ack();
        return;
      }

      const childLogger = logger.child({ userId: msg.body.userId });
      const result = await digestService.generateDigestForUser({
        drizzleDb,
        userId: msg.body.userId,
        logger: childLogger,
      });

      if (result.ok) {
        msg.ack();
      } else {
        childLogger.error("digest generation failed", {
          error: result.error,
        });
        msg.retry();
      }
    }),
  );
};

import { createDrizzle } from "../db/client";
import type { Logger } from "../lib/logger";
import type { Env } from "../types";
import * as digestRepo from "../repositories/digest-repository";
import type { DigestQueueMessage } from "../queues/types";

export const handleDigestCron = async ({
  env,
  logger,
}: {
  readonly env: Env;
  readonly logger: Logger;
}): Promise<void> => {
  const drizzleDb = createDrizzle(env.DB);
  const userIds = await digestRepo.findAllUserIds({ drizzleDb, logger });

  logger.info("digest cron started", { userCount: userIds.length });

  await Promise.all(
    userIds.map(async (userId) => {
      const message: DigestQueueMessage = {
        type: "generate_digest",
        userId,
      };
      await env.QUEUE.send(message);
    }),
  );

  logger.info("digest cron completed", { enqueuedUsers: userIds.length });
};

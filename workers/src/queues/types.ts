export type DigestQueueMessage = {
  readonly type: "generate_digest";
  readonly userId: string;
};

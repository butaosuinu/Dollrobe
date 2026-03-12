import type {
  D1Database,
  R2Bucket,
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types";

export type Env = {
  readonly DB: D1Database;
  readonly BUCKET: R2Bucket;
  readonly KV: KVNamespace;
  readonly QUEUE: Queue;
  readonly R2_PUBLIC_URL: string;
  readonly BETTER_AUTH_SECRET: string;
  readonly TWITTER_CLIENT_ID: string;
  readonly TWITTER_CLIENT_SECRET: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
};

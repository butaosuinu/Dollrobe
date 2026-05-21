import * as Sentry from "@sentry/cloudflare";
import type { CloudflareOptions } from "@sentry/cloudflare";
import type { TRPCError } from "@trpc/server";
import type { Env } from "../types";

type SentryEnv = Pick<
  Env,
  "SENTRY_DSN" | "SENTRY_ENVIRONMENT" | "SENTRY_RELEASE"
>;

// 100 ユーザー規模で Sentry の Developer plan (10K transactions/month) を
// 圧迫しない値。production で観測量が足りなければ環境別に上げる。
const DEFAULT_TRACES_SAMPLE_RATE = 0.05;
const UNKNOWN_PROCEDURE = "<unknown>";

// 4xx 相当の tRPC エラーは利用者起因なので Sentry に送らない。
// BAD_REQUEST 系のバリデーションエラーは構造化ログ側で十分追跡できる。
const NON_CAPTURED_TRPC_CODES: ReadonlySet<TRPCError["code"]> = new Set([
  "PARSE_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNSUPPORTED_MEDIA_TYPE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

// fetch hot path で毎リクエスト再生成しないため module レベルで保持する。
const INTEGRATIONS = [Sentry.honoIntegration()];

// environment / release は env が未設定なら option キー自体を生やさない。
// @sentry/cloudflare はユーザー指定の release が undefined でも user 値として
// 優先してしまい CF_VERSION_METADATA.id への自動 fallback が効かなくなるため。
// environment も "local" を固定 default にすると prod/staging で env 変数を
// 入れ忘れたときに本番イベントが local 扱いになりアラートが機能しなくなる。
export const buildSentryOptions = (env: SentryEnv): CloudflareOptions => ({
  dsn: env.SENTRY_DSN,
  ...(env.SENTRY_ENVIRONMENT !== undefined && {
    environment: env.SENTRY_ENVIRONMENT,
  }),
  ...(env.SENTRY_RELEASE !== undefined && { release: env.SENTRY_RELEASE }),
  tracesSampleRate: DEFAULT_TRACES_SAMPLE_RATE,
  integrations: INTEGRATIONS,
});

export const shouldCaptureTrpcError = (code: TRPCError["code"]): boolean =>
  !NON_CAPTURED_TRPC_CODES.has(code);

export const captureTrpcError = ({
  error,
  path,
}: {
  readonly error: TRPCError;
  readonly path: string | undefined;
}): void => {
  if (!shouldCaptureTrpcError(error.code)) {
    return;
  }
  Sentry.captureException(error.cause ?? error, {
    tags: { trpc_procedure: path ?? UNKNOWN_PROCEDURE, trpc_code: error.code },
  });
};

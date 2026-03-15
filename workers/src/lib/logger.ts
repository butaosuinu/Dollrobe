type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

type Logger = {
  readonly debug: (message: string, context?: LogContext) => void;
  readonly info: (message: string, context?: LogContext) => void;
  readonly warn: (message: string, context?: LogContext) => void;
  readonly error: (message: string, context?: LogContext) => void;
  readonly child: (childContext: LogContext) => Logger;
};

const LOG_LEVEL_PRIORITY = Object.freeze({
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const);

const serializeError = (
  value: unknown,
): { readonly message: string; readonly stack?: string } | undefined => {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack };
  }
  return undefined;
};

const serializeContext = (context: LogContext): LogContext =>
  Object.entries(context).reduce<LogContext>(
    (acc, [key, value]) => ({ ...acc, [key]: serializeError(value) ?? value }),
    {},
  );

export const createLogger = ({
  minLevel = "info",
  baseContext = {},
}: {
  readonly minLevel?: LogLevel;
  readonly baseContext?: LogContext;
} = {}): Logger => {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
      return;
    }

    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...serializeContext(baseContext),
      ...(context !== undefined ? serializeContext(context) : {}),
    };

    if (level === "error") {
      // eslint-disable-next-line no-console -- Logger is the designated console output wrapper
      console.error(JSON.stringify(entry));
    } else {
      // eslint-disable-next-line no-console -- Logger is the designated console output wrapper
      console.log(JSON.stringify(entry));
    }
  };

  return {
    debug: (message, context) => {
      log("debug", message, context);
    },
    info: (message, context) => {
      log("info", message, context);
    },
    warn: (message, context) => {
      log("warn", message, context);
    },
    error: (message, context) => {
      log("error", message, context);
    },
    child: (childContext) =>
      createLogger({
        minLevel,
        baseContext: { ...baseContext, ...childContext },
      }),
  };
};

export type { Logger, LogLevel, LogContext };

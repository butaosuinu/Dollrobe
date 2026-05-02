import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { http, HttpResponse } from "msw";
import { isRecord } from "@/lib/typeGuards";
import type { AppRouter } from "../../../../workers/src/trpc/router";

type RouterInputsRaw = inferRouterInputs<AppRouter>;
type RouterOutputsRaw = inferRouterOutputs<AppRouter>;

export type ProcedurePath = {
  [R in keyof RouterInputsRaw]: {
    [P in keyof RouterInputsRaw[R]]: `${R & string}.${P & string}`;
  }[keyof RouterInputsRaw[R]];
}[keyof RouterInputsRaw];

export type RouterInputs = {
  [P in ProcedurePath]: P extends `${infer R}.${infer K}`
    ? R extends keyof RouterInputsRaw
      ? K extends keyof RouterInputsRaw[R]
        ? RouterInputsRaw[R][K]
        : never
      : never
    : never;
};

export type RouterOutputs = {
  [P in ProcedurePath]: P extends `${infer R}.${infer K}`
    ? R extends keyof RouterOutputsRaw
      ? K extends keyof RouterOutputsRaw[R]
        ? RouterOutputsRaw[R][K]
        : never
      : never
    : never;
};

export type Resolver<P extends ProcedurePath> = (args: {
  readonly input: unknown;
  readonly request: Request;
}) => RouterOutputs[P] | Promise<RouterOutputs[P]>;

type WideResolver = Resolver<ProcedurePath>;

const defaultRegistry = {
  queries: new Map<string, WideResolver>(),
  mutations: new Map<string, WideResolver>(),
};

const overrideRegistry = {
  queries: new Map<string, WideResolver>(),
  mutations: new Map<string, WideResolver>(),
};

export const registerDefaultQuery = <P extends ProcedurePath>(
  path: P,
  resolver: Resolver<P>,
): void => {
  defaultRegistry.queries.set(path, resolver);
};

export const registerDefaultMutation = <P extends ProcedurePath>(
  path: P,
  resolver: Resolver<P>,
): void => {
  defaultRegistry.mutations.set(path, resolver);
};

export const clearTrpcOverrides = (): void => {
  overrideRegistry.queries.clear();
  overrideRegistry.mutations.clear();
  responseCache.clear();
};

const resolveByPath = (
  kind: "queries" | "mutations",
  path: string,
): WideResolver | undefined =>
  overrideRegistry[kind].get(path) ?? defaultRegistry[kind].get(path);

const errorEntry = (message: string) => ({
  error: {
    message,
    code: -32603,
    data: {
      code: "INTERNAL_SERVER_ERROR",
      httpStatus: 500,
    },
  },
});

const successEntry = (output: unknown) => ({
  result: { data: output },
});

const parseJsonOrEmpty = (text: string): Record<string, unknown> => {
  if (text === "") return {};
  const parsed: unknown = JSON.parse(text);
  return isRecord(parsed) ? parsed : {};
};

const parseGetInputs = (url: URL): Record<string, unknown> => {
  const inputParam = url.searchParams.get("input");
  if (inputParam === null) return {};
  return parseJsonOrEmpty(inputParam);
};

const parsePostInputs = async (
  request: Request,
): Promise<Record<string, unknown>> => {
  const text = await request.clone().text();
  return parseJsonOrEmpty(text);
};

type ResolverOutcome =
  | { readonly kind: "ok"; readonly value: unknown }
  | { readonly kind: "error"; readonly message: string };

const runResolver = async (
  resolver: WideResolver,
  input: unknown,
  request: Request,
): Promise<ResolverOutcome> => {
  const errorSentinel = Symbol("trpc-mock-error");
  const value: unknown = await Promise.resolve(
    resolver({ input, request }),
  ).catch((error: unknown) => ({ [errorSentinel]: error }));
  if (typeof value === "object" && value !== null && errorSentinel in value) {
    const error: unknown = Reflect.get(value, errorSentinel);
    return {
      kind: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
  return { kind: "ok", value };
};

const dispatch = async (
  paths: readonly string[],
  inputs: Record<string, unknown>,
  kind: "queries" | "mutations",
  request: Request,
): Promise<readonly unknown[]> =>
  await Promise.all(
    paths.map(async (path, i) => {
      const resolver = resolveByPath(kind, path);
      if (resolver === undefined) {
        return errorEntry(`No mock handler for tRPC ${kind} ${path}`);
      }
      const { [String(i)]: input } = inputs;
      const outcome = await runResolver(resolver, input, request);
      if (outcome.kind === "error") {
        return errorEntry(outcome.message);
      }
      return successEntry(outcome.value);
    }),
  );

const responseCache = new Map<string, readonly unknown[]>();
const RESPONSE_CACHE_TTL_MS = 1000;

const cacheCleanup = (requestId: string) => {
  const timer = setTimeout(() => {
    responseCache.delete(requestId);
  }, RESPONSE_CACHE_TTL_MS);
  timer.unref?.();
};

const getDispatcher = http.get(
  "*/trpc/:paths",
  async ({ request, params, requestId }) => {
    const cached = responseCache.get(requestId);
    if (cached !== undefined) {
      return HttpResponse.json(cached);
    }
    const { paths: pathsParam } = params;
    const paths = String(pathsParam).split(",");
    const inputs = parseGetInputs(new URL(request.url));
    const results = await dispatch(paths, inputs, "queries", request);
    responseCache.set(requestId, results);
    cacheCleanup(requestId);
    return HttpResponse.json(results);
  },
);

const postDispatcher = http.post(
  "*/trpc/:paths",
  async ({ request, params, requestId }) => {
    const cached = responseCache.get(requestId);
    if (cached !== undefined) {
      return HttpResponse.json(cached);
    }
    const { paths: pathsParam } = params;
    const paths = String(pathsParam).split(",");
    const inputs = await parsePostInputs(request);
    const results = await dispatch(paths, inputs, "mutations", request);
    responseCache.set(requestId, results);
    cacheCleanup(requestId);
    return HttpResponse.json(results);
  },
);

export const trpcDispatcherHandlers = [getDispatcher, postDispatcher];

const noopHandler = http.get("__never_matches_trpc_override__", () =>
  HttpResponse.error(),
);

export const trpcQuery = <P extends ProcedurePath>(
  path: P,
  resolver: Resolver<P>,
) => {
  overrideRegistry.queries.set(path, resolver);
  return noopHandler;
};

export const trpcMutation = <P extends ProcedurePath>(
  path: P,
  resolver: Resolver<P>,
) => {
  overrideRegistry.mutations.set(path, resolver);
  return noopHandler;
};

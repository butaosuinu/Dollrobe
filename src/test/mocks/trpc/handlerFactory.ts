import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { http, HttpResponse } from "msw";
import { isRecord } from "@/lib/typeGuards";
import type { AppRouter } from "../../../../workers/src/trpc/router";

type RouterInputsRaw = inferRouterInputs<AppRouter>;
type RouterOutputsRaw = inferRouterOutputs<AppRouter>;

// 入力/出力が plain object なら procedure leaf、それ以外 (ネストされた router の object) は再帰。
// tRPC の inferRouterInputs では procedure の input は record か void/undefined になる。
// 厳密な leaf 判定は難しいので、`object` を再帰し、`void`/`undefined`/primitives を leaf とみなす。
// admin.users.list のように 3 階層まで対応。
type FlattenPath<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? `${Prefix}${K}` | FlattenPath<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type ProcedurePath = FlattenPath<RouterInputsRaw>;

type GetByPath<T, P extends string> = P extends `${infer Head}.${infer Tail}`
  ? Head extends keyof T
    ? GetByPath<T[Head], Tail>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type RouterInputs = {
  [P in ProcedurePath]: GetByPath<RouterInputsRaw, P>;
};

export type RouterOutputs = {
  [P in ProcedurePath]: GetByPath<RouterOutputsRaw, P>;
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
  inFlightDispatches.clear();
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
  const invoke = async (): Promise<unknown> =>
    await resolver({ input, request });
  const value: unknown = await invoke().catch((error: unknown) => ({
    [errorSentinel]: error,
  }));
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

const inFlightDispatches = new Map<string, Promise<readonly unknown[]>>();
const RESPONSE_CACHE_TTL_MS = 1000;

const cacheCleanup = (requestId: string) => {
  const timer = setTimeout(() => {
    inFlightDispatches.delete(requestId);
  }, RESPONSE_CACHE_TTL_MS);
  timer.unref?.();
};

const dedupedDispatch = async (
  requestId: string,
  produce: () => Promise<readonly unknown[]>,
): Promise<readonly unknown[]> => {
  const existing = inFlightDispatches.get(requestId);
  if (existing !== undefined) return await existing;
  const promise = produce();
  inFlightDispatches.set(requestId, promise);
  cacheCleanup(requestId);
  return await promise;
};

const getDispatcher = http.get(
  "*/trpc/:paths",
  async ({ request, params, requestId }) => {
    const { paths: pathsParam } = params;
    const paths = String(pathsParam).split(",");
    const inputs = parseGetInputs(new URL(request.url));
    const results = await dedupedDispatch(
      requestId,
      async () => await dispatch(paths, inputs, "queries", request),
    );
    return HttpResponse.json(results);
  },
);

const postDispatcher = http.post(
  "*/trpc/:paths",
  async ({ request, params, requestId }) => {
    const { paths: pathsParam } = params;
    const paths = String(pathsParam).split(",");
    const inputs = await parsePostInputs(request);
    const results = await dedupedDispatch(
      requestId,
      async () => await dispatch(paths, inputs, "mutations", request),
    );
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

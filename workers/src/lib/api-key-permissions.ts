export const API_KEY_SCOPE = Object.freeze({
  READ: "read",
  WRITE: "write",
} as const);

export type ApiKeyScope = (typeof API_KEY_SCOPE)[keyof typeof API_KEY_SCOPE];

export const API_KEY_PERMISSION_NAMESPACE = Object.freeze({
  ALL: "all",
  MCP: "mcp",
} as const);

type ApiKeyPermissionNamespace =
  (typeof API_KEY_PERMISSION_NAMESPACE)[keyof typeof API_KEY_PERMISSION_NAMESPACE];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const parseApiKeyScope = ({
  permissions,
  namespace,
}: {
  readonly permissions: unknown;
  readonly namespace: ApiKeyPermissionNamespace;
}): ApiKeyScope | undefined => {
  if (!isRecord(permissions)) {
    return undefined;
  }
  const actions = permissions[namespace];
  if (!Array.isArray(actions)) {
    return undefined;
  }
  if (actions.includes(API_KEY_SCOPE.WRITE)) {
    return API_KEY_SCOPE.WRITE;
  }
  if (actions.includes(API_KEY_SCOPE.READ)) {
    return API_KEY_SCOPE.READ;
  }
  return undefined;
};

export const hasApiKeyScope = ({
  current,
  required,
}: {
  readonly current: ApiKeyScope;
  readonly required: ApiKeyScope;
}): boolean =>
  required === API_KEY_SCOPE.READ ? true : current === API_KEY_SCOPE.WRITE;

export const buildStoredApiKeyPermissions = (
  actions: readonly ApiKeyScope[],
): Record<string, ApiKeyScope[]> => ({
  [API_KEY_PERMISSION_NAMESPACE.ALL]: [...actions],
  [API_KEY_PERMISSION_NAMESPACE.MCP]: [...actions],
});

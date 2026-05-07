export type McpScope = "read" | "write";

const SCOPE_KEY = "mcp" as const;
const SCOPE_READ = "read" as const;
const SCOPE_WRITE = "write" as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const parsePermissions = (
  permissions: unknown,
): McpScope | undefined => {
  if (!isRecord(permissions)) {
    return undefined;
  }
  const actions = permissions[SCOPE_KEY];
  if (!Array.isArray(actions)) {
    return undefined;
  }
  if (actions.includes(SCOPE_WRITE)) {
    return SCOPE_WRITE;
  }
  if (actions.includes(SCOPE_READ)) {
    return SCOPE_READ;
  }
  return undefined;
};

export const TOOL_REQUIRED_SCOPE = {
  list_garments: SCOPE_READ,
  get_garment: SCOPE_READ,
  list_dolls: SCOPE_READ,
  list_storage_cases: SCOPE_READ,
  get_storage_case: SCOPE_READ,
  get_organization_digest: SCOPE_READ,
  list_coordinates: SCOPE_READ,
  add_garment_tags: SCOPE_WRITE,
  create_coordinate: SCOPE_WRITE,
} as const satisfies Record<string, McpScope>;

export type McpToolName = keyof typeof TOOL_REQUIRED_SCOPE;

export const hasScope = (current: McpScope, required: McpScope): boolean =>
  required === SCOPE_READ ? true : current === SCOPE_WRITE;

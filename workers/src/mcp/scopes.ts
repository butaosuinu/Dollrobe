import {
  API_KEY_PERMISSION_NAMESPACE,
  API_KEY_SCOPE,
  hasApiKeyScope,
  parseApiKeyScope,
} from "../lib/api-key-permissions";
import type { ApiKeyScope } from "../lib/api-key-permissions";

export type McpScope = ApiKeyScope;

export const parsePermissions = (permissions: unknown): McpScope | undefined =>
  parseApiKeyScope({
    permissions,
    namespace: API_KEY_PERMISSION_NAMESPACE.MCP,
  });

export const TOOL_REQUIRED_SCOPE = {
  list_garments: API_KEY_SCOPE.READ,
  get_garment: API_KEY_SCOPE.READ,
  list_dolls: API_KEY_SCOPE.READ,
  list_storage_cases: API_KEY_SCOPE.READ,
  get_storage_case: API_KEY_SCOPE.READ,
  get_organization_digest: API_KEY_SCOPE.READ,
  list_coordinates: API_KEY_SCOPE.READ,
  add_garment_tags: API_KEY_SCOPE.WRITE,
  create_coordinate: API_KEY_SCOPE.WRITE,
} as const satisfies Record<string, McpScope>;

export type McpToolName = keyof typeof TOOL_REQUIRED_SCOPE;

export const hasScope = (current: McpScope, required: McpScope): boolean =>
  hasApiKeyScope({ current, required });

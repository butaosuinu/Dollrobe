import { vi } from "vitest";
import type { ApiKeyScope, ApiKeySummary, CreatedApiKey } from "@/lib/auth";

type Spies = {
  readonly createApiKey: ReturnType<typeof vi.fn>;
  readonly listApiKeys: ReturnType<typeof vi.fn>;
  readonly revokeApiKey: ReturnType<typeof vi.fn>;
};

type State = {
  readonly apiKeys: readonly ApiKeySummary[];
  readonly nextCreated: CreatedApiKey | undefined;
  readonly createShouldFail: boolean;
  readonly listShouldFail: boolean;
  readonly revokeShouldFail: boolean;
  readonly spies: Spies;
};

const createInitial = (): State => ({
  apiKeys: [],
  nextCreated: undefined,
  createShouldFail: false,
  listShouldFail: false,
  revokeShouldFail: false,
  spies: {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn(),
  },
});

const initialState = createInitial();
const stateMap = new Map<"v", State>([["v", initialState]]);
const getState = (): State => stateMap.get("v") ?? initialState;
const setState = (next: State): void => {
  stateMap.set("v", next);
};

export const authClientFactory = async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    createApiKey: async (input: {
      readonly name: string;
      readonly scope: ApiKeyScope;
    }): Promise<CreatedApiKey> => {
      const s = getState();
      s.spies.createApiKey(input);
      if (s.createShouldFail) {
        return await Promise.reject(new Error("Failed to create API key"));
      }
      const created: CreatedApiKey = s.nextCreated ?? {
        id: `api-key-${Date.now()}`,
        name: input.name,
        scope: input.scope,
        createdAt: Date.now(),
        lastRequestAt: undefined,
        enabled: true,
        key: `dwk_test_${Math.random().toString(36).slice(2)}`,
      };
      setState({ ...s, apiKeys: [...s.apiKeys, created] });
      return created;
    },
    listApiKeys: async (): Promise<readonly ApiKeySummary[]> => {
      const s = getState();
      s.spies.listApiKeys();
      if (s.listShouldFail) {
        return await Promise.reject(new Error("Failed to list API keys"));
      }
      return s.apiKeys;
    },
    revokeApiKey: async (keyId: string): Promise<void> => {
      const s = getState();
      s.spies.revokeApiKey(keyId);
      if (s.revokeShouldFail) {
        await Promise.reject(new Error("Failed to revoke API key"));
        return;
      }
      setState({
        ...s,
        apiKeys: s.apiKeys.filter((k) => k.id !== keyId),
      });
    },
  };
};

type SetupOverrides = {
  readonly apiKeys?: readonly ApiKeySummary[];
  readonly nextCreated?: CreatedApiKey;
  readonly createShouldFail?: boolean;
  readonly listShouldFail?: boolean;
  readonly revokeShouldFail?: boolean;
};

export const setupAuthClient = (overrides: SetupOverrides = {}) => {
  const current = getState();
  current.spies.createApiKey.mockClear();
  current.spies.listApiKeys.mockClear();
  current.spies.revokeApiKey.mockClear();

  setState({
    apiKeys: overrides.apiKeys ?? [],
    nextCreated: overrides.nextCreated,
    createShouldFail: overrides.createShouldFail ?? false,
    listShouldFail: overrides.listShouldFail ?? false,
    revokeShouldFail: overrides.revokeShouldFail ?? false,
    spies: current.spies,
  });

  return { spies: current.spies };
};

import { vi } from "vitest";
import type {
  ApiKeyScope,
  ApiKeySummary,
  ChangeEmailInput,
  ChangePasswordInput,
  CreatedApiKey,
  DeleteAccountInput,
  LinkedAccount,
  SetPasswordInput,
  SignInEmailInput,
  UpdateProfileInput,
} from "@/lib/auth";

type Spies = {
  readonly createApiKey: ReturnType<typeof vi.fn>;
  readonly listApiKeys: ReturnType<typeof vi.fn>;
  readonly revokeApiKey: ReturnType<typeof vi.fn>;
  readonly signInWithEmail: ReturnType<typeof vi.fn>;
  readonly signUpWithEmail: ReturnType<typeof vi.fn>;
  readonly updateProfile: ReturnType<typeof vi.fn>;
  readonly changeEmail: ReturnType<typeof vi.fn>;
  readonly changePassword: ReturnType<typeof vi.fn>;
  readonly setPassword: ReturnType<typeof vi.fn>;
  readonly deleteAccount: ReturnType<typeof vi.fn>;
  readonly listAccounts: ReturnType<typeof vi.fn>;
};

type State = {
  readonly apiKeys: readonly ApiKeySummary[];
  readonly nextCreated: CreatedApiKey | undefined;
  readonly accounts: readonly LinkedAccount[];
  readonly createShouldFail: boolean;
  readonly listShouldFail: boolean;
  readonly revokeShouldFail: boolean;
  readonly signInShouldFail: boolean;
  readonly signUpShouldFail: boolean;
  readonly updateProfileShouldFail: boolean;
  readonly changeEmailShouldFail: boolean;
  readonly changePasswordShouldFail: boolean;
  readonly setPasswordShouldFail: boolean;
  readonly deleteAccountShouldFail: boolean;
  readonly spies: Spies;
};

const createInitial = (): State => ({
  apiKeys: [],
  nextCreated: undefined,
  accounts: [{ providerId: "credential" }],
  createShouldFail: false,
  listShouldFail: false,
  revokeShouldFail: false,
  signInShouldFail: false,
  signUpShouldFail: false,
  updateProfileShouldFail: false,
  changeEmailShouldFail: false,
  changePasswordShouldFail: false,
  setPasswordShouldFail: false,
  deleteAccountShouldFail: false,
  spies: {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    updateProfile: vi.fn(),
    changeEmail: vi.fn(),
    changePassword: vi.fn(),
    setPassword: vi.fn(),
    deleteAccount: vi.fn(),
    listAccounts: vi.fn(),
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
    signInWithEmail: async (input: SignInEmailInput): Promise<void> => {
      const s = getState();
      s.spies.signInWithEmail(input);
      if (s.signInShouldFail) {
        await Promise.reject(new Error("Failed to sign in"));
      }
    },
    signUpWithEmail: async (input: {
      readonly name: string;
      readonly email: string;
      readonly password: string;
    }): Promise<void> => {
      const s = getState();
      s.spies.signUpWithEmail(input);
      if (s.signUpShouldFail) {
        await Promise.reject(new Error("Failed to sign up"));
      }
    },
    updateProfile: async (input: UpdateProfileInput): Promise<void> => {
      const s = getState();
      s.spies.updateProfile(input);
      if (s.updateProfileShouldFail) {
        await Promise.reject(new Error("Failed to update profile"));
      }
    },
    changeEmail: async (input: ChangeEmailInput): Promise<void> => {
      const s = getState();
      s.spies.changeEmail(input);
      if (s.changeEmailShouldFail) {
        await Promise.reject(new Error("Failed to change email"));
      }
    },
    changePassword: async (input: ChangePasswordInput): Promise<void> => {
      const s = getState();
      s.spies.changePassword(input);
      if (s.changePasswordShouldFail) {
        await Promise.reject(new Error("Failed to change password"));
      }
    },
    setPassword: async (input: SetPasswordInput): Promise<void> => {
      const s = getState();
      s.spies.setPassword(input);
      if (s.setPasswordShouldFail) {
        await Promise.reject(new Error("Failed to set password"));
      }
    },
    deleteAccount: async (input: DeleteAccountInput): Promise<void> => {
      const s = getState();
      s.spies.deleteAccount(input);
      if (s.deleteAccountShouldFail) {
        await Promise.reject(new Error("Failed to delete account"));
      }
    },
    listAccounts: async (): Promise<readonly LinkedAccount[]> => {
      const s = getState();
      s.spies.listAccounts();
      return await Promise.resolve(s.accounts);
    },
  };
};

type SetupOverrides = {
  readonly apiKeys?: readonly ApiKeySummary[];
  readonly nextCreated?: CreatedApiKey;
  readonly accounts?: readonly LinkedAccount[];
  readonly createShouldFail?: boolean;
  readonly listShouldFail?: boolean;
  readonly revokeShouldFail?: boolean;
  readonly signInShouldFail?: boolean;
  readonly signUpShouldFail?: boolean;
  readonly updateProfileShouldFail?: boolean;
  readonly changeEmailShouldFail?: boolean;
  readonly changePasswordShouldFail?: boolean;
  readonly setPasswordShouldFail?: boolean;
  readonly deleteAccountShouldFail?: boolean;
};

export const setupAuthClient = (overrides: SetupOverrides = {}) => {
  const current = getState();
  current.spies.createApiKey.mockClear();
  current.spies.listApiKeys.mockClear();
  current.spies.revokeApiKey.mockClear();
  current.spies.signInWithEmail.mockClear();
  current.spies.signUpWithEmail.mockClear();
  current.spies.updateProfile.mockClear();
  current.spies.changeEmail.mockClear();
  current.spies.changePassword.mockClear();
  current.spies.setPassword.mockClear();
  current.spies.deleteAccount.mockClear();
  current.spies.listAccounts.mockClear();

  setState({
    apiKeys: overrides.apiKeys ?? [],
    nextCreated: overrides.nextCreated,
    accounts: overrides.accounts ?? [{ providerId: "credential" }],
    createShouldFail: overrides.createShouldFail ?? false,
    listShouldFail: overrides.listShouldFail ?? false,
    revokeShouldFail: overrides.revokeShouldFail ?? false,
    signInShouldFail: overrides.signInShouldFail ?? false,
    signUpShouldFail: overrides.signUpShouldFail ?? false,
    updateProfileShouldFail: overrides.updateProfileShouldFail ?? false,
    changeEmailShouldFail: overrides.changeEmailShouldFail ?? false,
    changePasswordShouldFail: overrides.changePasswordShouldFail ?? false,
    setPasswordShouldFail: overrides.setPasswordShouldFail ?? false,
    deleteAccountShouldFail: overrides.deleteAccountShouldFail ?? false,
    spies: current.spies,
  });

  return { spies: current.spies };
};

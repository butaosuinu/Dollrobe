import { vi, type Mock } from "vitest";
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

type CreateApiKeyInput = {
  readonly name: string;
  readonly scope: ApiKeyScope;
};

type SignUpEmailInput = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
};

type Spies = {
  readonly createApiKey: Mock<(input: CreateApiKeyInput) => void>;
  readonly listApiKeys: Mock<() => void>;
  readonly revokeApiKey: Mock<(keyId: string) => void>;
  readonly signInWithEmail: Mock<(input: SignInEmailInput) => void>;
  readonly signUpWithEmail: Mock<(input: SignUpEmailInput) => void>;
  readonly signOut: Mock<() => void>;
  readonly updateProfile: Mock<(input: UpdateProfileInput) => void>;
  readonly changeEmail: Mock<(input: ChangeEmailInput) => void>;
  readonly changePassword: Mock<(input: ChangePasswordInput) => void>;
  readonly setPassword: Mock<(input: SetPasswordInput) => void>;
  readonly deleteAccount: Mock<(input: DeleteAccountInput) => void>;
  readonly listAccounts: Mock<() => void>;
};

type State = {
  readonly apiKeys: readonly ApiKeySummary[];
  readonly nextCreated: CreatedApiKey | undefined;
  readonly accounts: readonly LinkedAccount[];
  readonly createShouldFail: boolean;
  readonly createErrorMessage: string | undefined;
  readonly listShouldFail: boolean;
  readonly revokeShouldFail: boolean;
  readonly signInShouldFail: boolean;
  readonly signUpShouldFail: boolean;
  readonly signOutShouldFail: boolean;
  readonly signOutResolveWithError: boolean;
  readonly updateProfileShouldFail: boolean;
  readonly changeEmailShouldFail: boolean;
  readonly changePasswordShouldFail: boolean;
  readonly setPasswordShouldFail: boolean;
  readonly deleteAccountShouldFail: boolean;
  readonly listAccountsShouldFail: boolean;
  readonly spies: Spies;
};

const createInitial = (): State => ({
  apiKeys: [],
  nextCreated: undefined,
  accounts: [{ providerId: "credential" }],
  createShouldFail: false,
  createErrorMessage: undefined,
  listShouldFail: false,
  revokeShouldFail: false,
  signInShouldFail: false,
  signUpShouldFail: false,
  signOutShouldFail: false,
  signOutResolveWithError: false,
  updateProfileShouldFail: false,
  changeEmailShouldFail: false,
  changePasswordShouldFail: false,
  setPasswordShouldFail: false,
  deleteAccountShouldFail: false,
  listAccountsShouldFail: false,
  spies: {
    createApiKey: vi.fn<(input: CreateApiKeyInput) => void>(),
    listApiKeys: vi.fn<() => void>(),
    revokeApiKey: vi.fn<(keyId: string) => void>(),
    signInWithEmail: vi.fn<(input: SignInEmailInput) => void>(),
    signUpWithEmail: vi.fn<(input: SignUpEmailInput) => void>(),
    signOut: vi.fn<() => void>(),
    updateProfile: vi.fn<(input: UpdateProfileInput) => void>(),
    changeEmail: vi.fn<(input: ChangeEmailInput) => void>(),
    changePassword: vi.fn<(input: ChangePasswordInput) => void>(),
    setPassword: vi.fn<(input: SetPasswordInput) => void>(),
    deleteAccount: vi.fn<(input: DeleteAccountInput) => void>(),
    listAccounts: vi.fn<() => void>(),
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
        return await Promise.reject(
          new Error(
            s.createErrorMessage ?? actual.API_KEY_CREATE_FALLBACK_ERROR,
          ),
        );
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
    signOut: async (): Promise<
      { readonly error: Error | null } | undefined
    > => {
      const s = getState();
      s.spies.signOut();
      if (s.signOutShouldFail) {
        await Promise.reject(new Error("Failed to sign out"));
      }
      return s.signOutResolveWithError
        ? { error: new Error("Failed to sign out (resolved)") }
        : undefined;
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
      return s.listAccountsShouldFail
        ? await Promise.reject(new Error("Failed to list accounts"))
        : await Promise.resolve(s.accounts);
    },
  };
};

type SetupOverrides = {
  readonly apiKeys?: readonly ApiKeySummary[];
  readonly nextCreated?: CreatedApiKey;
  readonly accounts?: readonly LinkedAccount[];
  readonly createShouldFail?: boolean;
  readonly createErrorMessage?: string;
  readonly listShouldFail?: boolean;
  readonly revokeShouldFail?: boolean;
  readonly signInShouldFail?: boolean;
  readonly signUpShouldFail?: boolean;
  readonly signOutShouldFail?: boolean;
  readonly signOutResolveWithError?: boolean;
  readonly updateProfileShouldFail?: boolean;
  readonly changeEmailShouldFail?: boolean;
  readonly changePasswordShouldFail?: boolean;
  readonly setPasswordShouldFail?: boolean;
  readonly deleteAccountShouldFail?: boolean;
  readonly listAccountsShouldFail?: boolean;
};

export const setupAuthClient = (overrides: SetupOverrides = {}) => {
  const current = getState();
  current.spies.createApiKey.mockClear();
  current.spies.listApiKeys.mockClear();
  current.spies.revokeApiKey.mockClear();
  current.spies.signInWithEmail.mockClear();
  current.spies.signUpWithEmail.mockClear();
  current.spies.signOut.mockClear();
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
    createErrorMessage: overrides.createErrorMessage,
    listShouldFail: overrides.listShouldFail ?? false,
    revokeShouldFail: overrides.revokeShouldFail ?? false,
    signInShouldFail: overrides.signInShouldFail ?? false,
    signUpShouldFail: overrides.signUpShouldFail ?? false,
    signOutShouldFail: overrides.signOutShouldFail ?? false,
    signOutResolveWithError: overrides.signOutResolveWithError ?? false,
    updateProfileShouldFail: overrides.updateProfileShouldFail ?? false,
    changeEmailShouldFail: overrides.changeEmailShouldFail ?? false,
    changePasswordShouldFail: overrides.changePasswordShouldFail ?? false,
    setPasswordShouldFail: overrides.setPasswordShouldFail ?? false,
    deleteAccountShouldFail: overrides.deleteAccountShouldFail ?? false,
    listAccountsShouldFail: overrides.listAccountsShouldFail ?? false,
    spies: current.spies,
  });

  return { spies: current.spies };
};

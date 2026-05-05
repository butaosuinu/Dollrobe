"use client";

import { atom } from "jotai";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKeyScope,
  type ApiKeySummary,
  type CreatedApiKey,
} from "@/lib/auth";

const apiKeysRefreshTriggerAtom = atom(0);

export const apiKeysAtom = atom(
  async (get): Promise<readonly ApiKeySummary[]> => {
    get(apiKeysRefreshTriggerAtom);
    return await listApiKeys();
  },
);

export const createApiKeyAtom = atom(
  undefined,
  async (
    _get,
    set,
    input: { readonly name: string; readonly scope: ApiKeyScope },
  ): Promise<CreatedApiKey> => {
    const created = await createApiKey(input);
    set(apiKeysRefreshTriggerAtom, (prev) => prev + 1);
    return created;
  },
);

export const revokeApiKeyAtom = atom(
  undefined,
  async (_get, set, keyId: string): Promise<void> => {
    await revokeApiKey(keyId);
    set(apiKeysRefreshTriggerAtom, (prev) => prev + 1);
  },
);

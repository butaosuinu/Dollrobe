"use client";

import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { listAccounts, type LinkedAccount } from "@/lib/auth";
import { authSessionAtom } from "@/stores/authAtoms";

const CREDENTIAL_PROVIDER_ID = "credential";

const accountsAtom = atom(async (get): Promise<readonly LinkedAccount[]> => {
  const session = await get(authSessionAtom);
  return session.isAuthenticated ? await listAccounts().catch(() => []) : [];
});

export const accountsUnwrappedAtom = unwrap(
  accountsAtom,
  (prev): readonly LinkedAccount[] => prev ?? [],
);

export const hasPasswordAtom = atom((get) => {
  const accounts = get(accountsUnwrappedAtom);
  return accounts.some((a) => a.providerId === CREDENTIAL_PROVIDER_ID);
});

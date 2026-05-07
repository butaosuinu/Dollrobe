"use client";

import { atom } from "jotai";
import { unwrap } from "jotai/utils";
import { getSession, signOut as authSignOut } from "@/lib/auth";
import type { SessionResponse } from "@/lib/auth";

type AuthUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | undefined;
};

type AuthState = {
  readonly user: AuthUser | undefined;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
};

const extractUser = (
  session: SessionResponse | undefined,
): AuthUser | undefined => {
  const user = session?.data?.user;
  return user === undefined
    ? undefined
    : {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? undefined,
      };
};

const authRefreshTriggerAtom = atom(0);

export const authSessionAtom = atom(async (get): Promise<AuthState> => {
  get(authRefreshTriggerAtom);
  const session = await getSession().catch(() => undefined);
  const user = extractUser(session);
  return { user, isAuthenticated: user !== undefined, isLoading: false };
});

export const authSessionUnwrappedAtom = unwrap(
  authSessionAtom,
  (prev): AuthState =>
    prev ?? { user: undefined, isAuthenticated: false, isLoading: true },
);

export const signOutAtom = atom(undefined, async (_get, set) => {
  await authSignOut().catch(() => undefined);
  set(authRefreshTriggerAtom, (prev) => prev + 1);
});

// trigger を増やしただけでは authSessionAtom が再解決する前にナビゲートが走り、
// unwrap が prev (古い認証済み状態) を返してしまう。await get で新しい session が
// 解決するまで待つことで、退会後に /signin で stale auth が見える race を防ぐ。
export const refreshAuthAtom = atom(undefined, async (get, set) => {
  set(authRefreshTriggerAtom, (prev) => prev + 1);
  await get(authSessionAtom);
});

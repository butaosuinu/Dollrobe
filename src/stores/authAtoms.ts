"use client";

import { atom } from "jotai";
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
};

export const authStateAtom = atom<AuthState>({
  user: undefined,
  isAuthenticated: false,
});

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

export const fetchAuthSessionAtom = atom(undefined, async (_get, set) => {
  const session = await getSession().catch(() => undefined);
  const user = extractUser(session);
  set(authStateAtom, {
    user,
    isAuthenticated: user !== undefined,
  });
});

export const signOutAtom = atom(undefined, async (_get, set) => {
  await authSignOut().catch(() => undefined);
  set(authStateAtom, { user: undefined, isAuthenticated: false });
});

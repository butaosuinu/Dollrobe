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
  return { user, isAuthenticated: user !== undefined };
});

export const signOutAtom = atom(undefined, async (_get, set) => {
  await authSignOut().catch(() => undefined);
  set(authRefreshTriggerAtom, (prev) => prev + 1);
});

export const refreshAuthAtom = atom(undefined, (_get, set) => {
  set(authRefreshTriggerAtom, (prev) => prev + 1);
});

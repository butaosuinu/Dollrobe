import { createAuthClient } from "better-auth/react";

const WORKERS_URL =
  process.env.NEXT_PUBLIC_WORKERS_URL ?? "http://localhost:8787";

const client = createAuthClient({
  baseURL: `${WORKERS_URL}/api/auth`,
});

export type SessionUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image?: string | null | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SessionResponse = {
  readonly data?: {
    readonly user: SessionUser;
  } | null;
};

const { signOut: clientSignOut, useSession: clientUseSession, signIn } = client;
const { social } = signIn;

export const signInSocial = social;
export const signOut = clientSignOut;
export const useSession = clientUseSession;

export const getSession = async (): Promise<SessionResponse> => {
  const result = await client.getSession();
  const { data } = result;
  return { data };
};

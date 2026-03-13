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
  readonly image: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type SessionResponse = {
  readonly data:
    | {
        readonly user: SessionUser;
      }
    | undefined;
};

const { signOut: clientSignOut, signIn } = client;
const { social } = signIn;

export const signInSocial = social;
export const signOut = clientSignOut;

export const getSession = async (): Promise<SessionResponse> => {
  const { data: rawData } = await client.getSession();
  return {
    data:
      rawData === null
        ? undefined
        : {
            user: {
              ...rawData.user,
              image: rawData.user.image ?? undefined,
            },
          },
  };
};

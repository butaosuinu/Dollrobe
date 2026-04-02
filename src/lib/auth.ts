import { createAuthClient } from "better-auth/react";
import { WORKERS_URL_FOR_FETCH } from "@/lib/workersUrl";

const AUTH_BASE_URL =
  WORKERS_URL_FOR_FETCH === ""
    ? `${window.location.origin}/api/auth`
    : `${WORKERS_URL_FOR_FETCH}/api/auth`;

const client = createAuthClient({
  baseURL: AUTH_BASE_URL,
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

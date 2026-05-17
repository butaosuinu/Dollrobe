"use client";

import { atom } from "jotai";
import { trpcClient } from "@/lib/trpc";

const adminRefreshTriggerAtom = atom(0);

export const refreshAdminAtom = atom(undefined, (_get, set) => {
  set(adminRefreshTriggerAtom, (prev) => prev + 1);
});

// 戻り値の shape は workers 側 (admin-repository / admin-service) と一致させる。
// AppRouter からの inferRouterOutputs 経由だと jotai の writable atom 制約で
// 型が解決できなかったため、ここで shape を duplicate して固定する。

export type AdminUserRole = "admin" | "user";

export type AdminMetricsSummary = {
  readonly totalUsers: number;
  readonly frozenUsers: number;
  readonly totalGarments: number;
  readonly totalCoordinates: number;
  readonly totalLocations: number;
  readonly signupsLast7d: number;
};

const EMPTY_METRICS: AdminMetricsSummary = {
  totalUsers: 0,
  frozenUsers: 0,
  totalGarments: 0,
  totalCoordinates: 0,
  totalLocations: 0,
  signupsLast7d: 0,
};

export const adminMetricsAtom = atom(
  async (get): Promise<AdminMetricsSummary> => {
    if (typeof window === "undefined") {
      return EMPTY_METRICS;
    }
    get(adminRefreshTriggerAtom);
    return await trpcClient.admin.metrics.summary.query();
  },
);

export type AdminUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly image?: string;
  readonly role: AdminUserRole;
  readonly frozen: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
};

export type AdminUsersQuery = {
  readonly search?: string;
  readonly role?: AdminUserRole;
  readonly frozen?: boolean;
  readonly limit: number;
  readonly offset: number;
};

export type AdminUsersResult = {
  readonly items: readonly AdminUser[];
  readonly total: number;
};

const DEFAULT_USERS_QUERY: AdminUsersQuery = {
  limit: 50,
  offset: 0,
};

export const adminUsersQueryAtom = atom<AdminUsersQuery>(DEFAULT_USERS_QUERY);

export const adminUsersAtom = atom(async (get): Promise<AdminUsersResult> => {
  if (typeof window === "undefined") {
    return { items: [], total: 0 };
  }
  get(adminRefreshTriggerAtom);
  const query = get(adminUsersQueryAtom);
  return await trpcClient.admin.users.list.query(query);
});

export const adminUserDetailAtomFamily = (id: string) =>
  atom(async (get): Promise<AdminUser | undefined> => {
    if (typeof window === "undefined") {
      return undefined;
    }
    get(adminRefreshTriggerAtom);
    return await trpcClient.admin.users.detail
      .query({ id })
      .catch((): undefined => undefined);
  });

export type AdminAuditLog = {
  readonly id: string;
  readonly actorUserId: string;
  readonly action: string;
  readonly targetUserId?: string;
  readonly metadata?: string;
  readonly createdAt: number;
};

export type AdminAuditsQuery = {
  readonly action?: string;
  readonly actorUserId?: string;
  readonly targetUserId?: string;
  readonly limit: number;
  readonly offset: number;
};

export type AdminAuditsResult = {
  readonly items: readonly AdminAuditLog[];
  readonly total: number;
};

const DEFAULT_AUDITS_QUERY: AdminAuditsQuery = {
  limit: 50,
  offset: 0,
};

export const adminAuditsQueryAtom =
  atom<AdminAuditsQuery>(DEFAULT_AUDITS_QUERY);

export const adminAuditsAtom = atom(async (get): Promise<AdminAuditsResult> => {
  if (typeof window === "undefined") {
    return { items: [], total: 0 };
  }
  get(adminRefreshTriggerAtom);
  const query = get(adminAuditsQueryAtom);
  return await trpcClient.admin.audits.list.query(query);
});

const ADMIN_USER_DATA_LIMIT = 50;

export const adminUserGarmentsAtomFamily = (userId: string, offset: number) =>
  atom(async (get) => {
    if (typeof window === "undefined") {
      return { items: [], total: 0 };
    }
    get(adminRefreshTriggerAtom);
    return await trpcClient.admin.userDataView.garments.query({
      userId,
      limit: ADMIN_USER_DATA_LIMIT,
      offset,
    });
  });

export const adminUserCoordinatesAtomFamily = (
  userId: string,
  offset: number,
) =>
  atom(async (get) => {
    if (typeof window === "undefined") {
      return { items: [], total: 0 };
    }
    get(adminRefreshTriggerAtom);
    return await trpcClient.admin.userDataView.coordinates.query({
      userId,
      limit: ADMIN_USER_DATA_LIMIT,
      offset,
    });
  });

export const adminUserLocationsAtomFamily = (userId: string) =>
  atom(async (get) => {
    if (typeof window === "undefined") {
      return [];
    }
    get(adminRefreshTriggerAtom);
    return await trpcClient.admin.userDataView.locations.query({ userId });
  });

export const freezeUserAtom = atom(
  undefined,
  async (
    _get,
    set,
    input: { readonly targetUserId: string; readonly reason?: string },
  ) => {
    await trpcClient.admin.users.freeze.mutate(input);
    set(adminRefreshTriggerAtom, (prev) => prev + 1);
  },
);

export const unfreezeUserAtom = atom(
  undefined,
  async (
    _get,
    set,
    input: { readonly targetUserId: string; readonly reason?: string },
  ) => {
    await trpcClient.admin.users.unfreeze.mutate(input);
    set(adminRefreshTriggerAtom, (prev) => prev + 1);
  },
);

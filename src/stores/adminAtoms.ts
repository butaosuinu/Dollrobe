"use client";

import { atom } from "jotai";
import { TRPCClientError } from "@trpc/client";
import { trpcClient } from "@/lib/trpc";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { PageSize } from "@/lib/constants";
import { isRecord } from "@/lib/typeGuards";

// admin.users.detail が NOT_FOUND を返したケースだけ undefined にダウングレードし、
// transient / network / 500 などは ErrorBoundary に流すための判定。
// TRPCClientError の data?.code は workers 側 ServiceErrorCode と一致する。
const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof TRPCClientError)) return false;
  const { data } = error;
  if (!isRecord(data)) return false;
  return data.code === "NOT_FOUND";
};

// catch を「該当エラーなら値に変換、それ以外は再 throw」させるためのヘルパー。
// CLAUDE.md「try/catch 禁止」を守るため .catch のみで分岐する。
// throw は ErrorBoundary に到達させるための副作用 — 既存 lint exception と同じ
// 形 (toastAtoms.ts などで使われている) を踏襲する。
const rethrowUnless =
  <T>(predicate: (error: unknown) => boolean, fallback: T) =>
  (error: unknown): T => {
    if (predicate(error)) return fallback;
    // eslint-disable-next-line functional/no-throw-statements, @typescript-eslint/only-throw-error -- 上流 ErrorBoundary に到達させる
    throw error;
  };

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
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
};

export const adminUsersQueryAtom = atom<AdminUsersQuery>(DEFAULT_USERS_QUERY);

// Pagination ボタン用の write-only atom。limit を固定して offset のみ更新する。
// `(page - 1) * limit` で offset を導出するため、ページ 1 = offset 0。
export const setAdminUsersPageAtom = atom(
  undefined,
  (get, set, page: number) => {
    const current = get(adminUsersQueryAtom);
    const safePage = Math.max(1, page);
    set(adminUsersQueryAtom, {
      ...current,
      offset: (safePage - 1) * current.limit,
    });
  },
);

// pageSize 切り替え用。limit を更新して offset を 0 にリセット (現在ページ位置を失わせる)。
export const setAdminUsersPageSizeAtom = atom(
  undefined,
  (get, set, size: PageSize) => {
    const current = get(adminUsersQueryAtom);
    set(adminUsersQueryAtom, { ...current, limit: size, offset: 0 });
  },
);

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
    // NOT_FOUND は「ユーザーがいない」UI に流すために undefined にダウングレード。
    // それ以外 (transient / 500 / network) は ErrorBoundary に流して、
    // 障害を not-found 状態でマスクしないようにする。
    return await trpcClient.admin.users.detail
      .query({ id })
      .catch(rethrowUnless(isNotFoundError, undefined));
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
  limit: DEFAULT_PAGE_SIZE,
  offset: 0,
};

export const adminAuditsQueryAtom =
  atom<AdminAuditsQuery>(DEFAULT_AUDITS_QUERY);

export const setAdminAuditsPageAtom = atom(
  undefined,
  (get, set, page: number) => {
    const current = get(adminAuditsQueryAtom);
    const safePage = Math.max(1, page);
    set(adminAuditsQueryAtom, {
      ...current,
      offset: (safePage - 1) * current.limit,
    });
  },
);

export const setAdminAuditsPageSizeAtom = atom(
  undefined,
  (get, set, size: PageSize) => {
    const current = get(adminAuditsQueryAtom);
    set(adminAuditsQueryAtom, { ...current, limit: size, offset: 0 });
  },
);

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

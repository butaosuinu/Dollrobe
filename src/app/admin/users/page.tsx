"use client";

import { Suspense, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg, t } from "@lingui/core/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import SearchInput from "@/components/ui/SearchInput";
import ChipGroup from "@/components/ui/ChipGroup";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PageSize } from "@/lib/constants";
import { PAGE_SIZES } from "@/lib/constants";
import { Users as UsersIcon } from "lucide-react";
import UserTable from "@/components/admin/UserTable";
import {
  adminUsersAtom,
  adminUsersQueryAtom,
  setAdminUsersPageAtom,
  setAdminUsersPageSizeAtom,
  type AdminUserRole,
} from "@/stores/adminAtoms";

const ROLE_FILTERS = [
  { value: "all" as const, label: msg`全権限` },
  { value: "admin" as const, label: msg`管理者のみ` },
  { value: "user" as const, label: msg`一般のみ` },
];

const FROZEN_FILTERS = [
  { value: "all" as const, label: msg`全状態` },
  { value: "active" as const, label: msg`有効のみ` },
  { value: "frozen" as const, label: msg`凍結中のみ` },
];

type RoleFilter = (typeof ROLE_FILTERS)[number]["value"];
type FrozenFilter = (typeof FROZEN_FILTERS)[number]["value"];

const toRoleQuery = (value: RoleFilter): AdminUserRole | undefined =>
  value === "all" ? undefined : value;

const toFrozenQuery = (value: FrozenFilter): boolean | undefined => {
  if (value === "all") return undefined;
  return value === "frozen";
};

const isPageSize = (value: number): value is PageSize =>
  (PAGE_SIZES as readonly number[]).includes(value);

const normalizePageSize = (limit: number): PageSize =>
  isPageSize(limit) ? limit : PAGE_SIZES[0];

const UsersListContent = () => {
  const result = useAtomValue(adminUsersAtom);
  const query = useAtomValue(adminUsersQueryAtom);
  const setPage = useSetAtom(setAdminUsersPageAtom);
  const setPageSize = useSetAtom(setAdminUsersPageSizeAtom);

  // total=0 でしか empty state を出さない。items.length === 0 だが total > 0 の
  // ときは「offset が範囲外」状態。Pagination を残して別ページに戻れるようにする。
  if (result.total === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title={t`該当するユーザーがいません`}
        description={t`検索条件を変更してもう一度お試しください`}
      />
    );
  }

  const pageSize = normalizePageSize(query.limit);
  const totalPages = Math.max(1, Math.ceil(result.total / query.limit));
  const currentPage = Math.floor(query.offset / query.limit) + 1;

  return (
    <div className="flex flex-col gap-3">
      {result.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary">
          <Trans>このページには表示するユーザーがいません</Trans>
        </p>
      ) : (
        <UserTable users={result.items} />
      )}
      <Pagination
        pagination={{
          currentPage,
          totalPages,
          pageSize,
          totalCount: result.total,
        }}
        onChangePage={setPage}
        onChangePageSize={setPageSize}
      />
    </div>
  );
};

const AdminUsersPage = () => {
  const setQuery = useSetAtom(adminUsersQueryAtom);
  const [currentQuery] = useAtom(adminUsersQueryAtom);
  const [search, setSearch] = useState(currentQuery.search ?? "");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(
    currentQuery.role ?? "all",
  );
  const [frozenFilter, setFrozenFilter] = useState<FrozenFilter>(() => {
    if (currentQuery.frozen === undefined) return "all";
    return currentQuery.frozen ? "frozen" : "active";
  });
  const { i18n } = useLingui();

  const roleChips = useMemo(
    () =>
      ROLE_FILTERS.map(({ value, label }) => ({
        value,
        label: i18n._(label),
      })),
    [i18n],
  );
  const frozenChips = useMemo(
    () =>
      FROZEN_FILTERS.map(({ value, label }) => ({
        value,
        label: i18n._(label),
      })),
    [i18n],
  );

  const applyFilters = () => {
    setQuery({
      search: search === "" ? undefined : search,
      role: toRoleQuery(roleFilter),
      frozen: toFrozenQuery(frozenFilter),
      limit: currentQuery.limit,
      offset: 0,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setQuery({
      search: value === "" ? undefined : value,
      role: toRoleQuery(roleFilter),
      frozen: toFrozenQuery(frozenFilter),
      limit: currentQuery.limit,
      offset: 0,
    });
  };

  const handleRoleChange = (value: RoleFilter) => {
    setRoleFilter(value);
    setQuery({
      search: search === "" ? undefined : search,
      role: toRoleQuery(value),
      frozen: toFrozenQuery(frozenFilter),
      limit: currentQuery.limit,
      offset: 0,
    });
  };

  const handleFrozenChange = (value: FrozenFilter) => {
    setFrozenFilter(value);
    setQuery({
      search: search === "" ? undefined : search,
      role: toRoleQuery(roleFilter),
      frozen: toFrozenQuery(value),
      limit: currentQuery.limit,
      offset: 0,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold">
        <Trans>ユーザー管理</Trans>
      </h2>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <SearchInput
          value={search}
          onChangeValue={handleSearchChange}
          placeholder={i18n._(msg`メールアドレスや名前で検索...`)}
        />
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-text-tertiary">
              <Trans>権限</Trans>
            </p>
            <ChipGroup
              options={roleChips}
              value={roleFilter}
              onSelect={handleRoleChange}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-text-tertiary">
              <Trans>状態</Trans>
            </p>
            <ChipGroup
              options={frozenChips}
              value={frozenFilter}
              onSelect={handleFrozenChange}
            />
          </div>
        </div>
      </form>

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>ユーザー一覧の読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
          <UsersListContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default AdminUsersPage;

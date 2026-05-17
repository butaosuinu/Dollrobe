"use client";

import { Suspense } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ScrollText } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import type { PageSize } from "@/lib/constants";
import { PAGE_SIZES } from "@/lib/constants";
import AuditLogTable from "@/components/admin/AuditLogTable";
import {
  adminAuditsAtom,
  adminAuditsQueryAtom,
  setAdminAuditsPageAtom,
  setAdminAuditsPageSizeAtom,
} from "@/stores/adminAtoms";

const isPageSize = (value: number): value is PageSize =>
  (PAGE_SIZES as readonly number[]).includes(value);

const normalizePageSize = (limit: number): PageSize =>
  isPageSize(limit) ? limit : PAGE_SIZES[0];

const AuditsContent = () => {
  const result = useAtomValue(adminAuditsAtom);
  const query = useAtomValue(adminAuditsQueryAtom);
  const setPage = useSetAtom(setAdminAuditsPageAtom);
  const setPageSize = useSetAtom(setAdminAuditsPageSizeAtom);

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t`監査ログはまだありません`}
        description={t`凍結・解凍などの書き込み操作を行うとここに表示されます`}
      />
    );
  }

  const pageSize = normalizePageSize(query.limit);
  const totalPages = Math.max(1, Math.ceil(result.total / query.limit));
  const currentPage = Math.floor(query.offset / query.limit) + 1;

  return (
    <div className="flex flex-col gap-3">
      <AuditLogTable logs={result.items} />
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

const AdminAuditsPage = () => (
  <div className="flex flex-col gap-4">
    <h2 className="font-display text-lg font-bold">
      <Trans>監査ログ</Trans>
    </h2>
    <p className="text-sm text-text-tertiary">
      <Trans>
        書き込み操作 (凍結 / 解凍 等)
        のみが記録されます。閲覧操作は記録されません。
      </Trans>
    </p>
    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>監査ログの読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <AuditsContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default AdminAuditsPage;

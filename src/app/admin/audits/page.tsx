"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { ScrollText } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import AuditLogTable from "@/components/admin/AuditLogTable";
import usePagination from "@/hooks/usePagination";
import { adminAuditsAtom } from "@/stores/adminAtoms";

const AuditsContent = () => {
  const result = useAtomValue(adminAuditsAtom);
  const { paginatedItems, onChangePage, onChangePageSize, ...pagination } =
    usePagination({ items: result.items });

  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title={t`監査ログはまだありません`}
        description={t`凍結・解凍などの書き込み操作を行うとここに表示されます`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AuditLogTable logs={paginatedItems} />
      <Pagination
        pagination={pagination}
        onChangePage={onChangePage}
        onChangePageSize={onChangePageSize}
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

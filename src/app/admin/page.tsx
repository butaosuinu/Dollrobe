"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import {
  Users,
  Snowflake,
  Shirt,
  Sparkles,
  LayoutGrid,
  UserPlus,
} from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { msg } from "@lingui/core/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import MetricsCard from "@/components/admin/MetricsCard";
import Skeleton from "@/components/ui/Skeleton";
import { adminMetricsAtom } from "@/stores/adminAtoms";

const MetricsGrid = () => {
  const summary = useAtomValue(adminMetricsAtom);
  const { i18n } = useLingui();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MetricsCard
        icon={Users}
        label={i18n._(msg`総ユーザー数`)}
        value={summary.totalUsers}
      />
      <MetricsCard
        icon={Snowflake}
        label={i18n._(msg`凍結中ユーザー`)}
        value={summary.frozenUsers}
      />
      <MetricsCard
        icon={UserPlus}
        label={i18n._(msg`直近7日のサインアップ`)}
        value={summary.signupsLast7d}
      />
      <MetricsCard
        icon={Shirt}
        label={i18n._(msg`登録された服`)}
        value={summary.totalGarments}
      />
      <MetricsCard
        icon={Sparkles}
        label={i18n._(msg`コーデ数`)}
        value={summary.totalCoordinates}
      />
      <MetricsCard
        icon={LayoutGrid}
        label={i18n._(msg`収納場所数`)}
        value={summary.totalLocations}
      />
    </div>
  );
};

const MetricsSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-xl" />
    ))}
  </div>
);

const AdminMetricsPage = () => (
  <div className="flex flex-col gap-4">
    <h2 className="font-display text-lg font-bold">
      <Trans>メトリクスサマリ</Trans>
    </h2>
    <p className="text-sm text-text-tertiary">
      <Trans>
        リアルタイムの集計値です。サンプル数の少ない指標は今後のスナップショットで補完します。
      </Trans>
    </p>
    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>メトリクスの読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsGrid />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default AdminMetricsPage;

"use client";

import { Suspense } from "react";
import { Trans } from "@lingui/react/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StatsOverview from "@/components/dashboard/StatsOverview";
import AlertPanel from "@/components/dashboard/AlertPanel";
import RecentItems from "@/components/dashboard/RecentItems";
import OrphanCheckoutDialog from "@/components/scan/OrphanCheckoutDialog";
import DigestBanner from "@/components/digest/DigestBanner";
import Skeleton from "@/components/ui/Skeleton";

const StatsLoading = () => (
  <div>
    <Skeleton className="mb-3 h-4 w-20" />
    <div className="grid grid-cols-3 gap-3">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  </div>
);

const DashboardPage = () => (
  <div className="flex flex-col gap-6 p-4 lg:py-8">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <p className="text-sm text-text-secondary">
        <Trans>おかえりなさい</Trans>
      </p>
      <h2 className="font-display text-xl font-bold">
        <Trans>ダッシュボード</Trans>
      </h2>
    </div>

    <ErrorBoundary fallback={<></>}>
      <Suspense fallback={<></>}>
        <DigestBanner />
      </Suspense>
    </ErrorBoundary>

    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[2fr_1fr] lg:items-start lg:gap-8">
      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<StatsLoading />}>
          <StatsOverview />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<></>}>
        <Suspense fallback={<Skeleton className="h-20 rounded-xl" />}>
          <AlertPanel />
        </Suspense>
      </ErrorBoundary>
    </div>

    <ErrorBoundary fallback={<></>}>
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <RecentItems />
      </Suspense>
    </ErrorBoundary>

    <ErrorBoundary fallback={<></>}>
      <Suspense>
        <OrphanCheckoutDialog />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default DashboardPage;

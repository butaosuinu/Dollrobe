"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StatsOverview from "@/components/dashboard/StatsOverview";
import AlertPanel from "@/components/dashboard/AlertPanel";
import RecentItems from "@/components/dashboard/RecentItems";
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
  <div className="flex flex-col gap-6 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <p className="text-sm text-text-secondary">おかえりなさい</p>
      <h2 className="font-display text-xl font-bold">ダッシュボード</h2>
    </div>

    <ErrorBoundary
      fallback={<p className="text-sm text-danger">読み込みに失敗しました</p>}
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

    <ErrorBoundary fallback={<></>}>
      <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
        <RecentItems />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default DashboardPage;

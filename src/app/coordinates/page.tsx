"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus, Sparkles } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { coordinatesAtom } from "@/stores/coordinateAtoms";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import CoordinateCard from "@/components/coordinate/CoordinateCard";
import EmptyState from "@/components/ui/EmptyState";
import FAB from "@/components/ui/FAB";
import Skeleton from "@/components/ui/Skeleton";

const CoordinatesContent = () => {
  const router = useRouter();
  const coordinates = useAtomValue(coordinatesAtom);
  const garments = useAtomValue(garmentsAtom);

  if (coordinates.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={t`まだコーデがありません`}
        description={t`お気に入りの組み合わせを保存しておきましょう`}
        actionLabel={t`コーデを作る`}
        onAction={() => {
          router.push("/coordinates/new");
        }}
      />
    );
  }

  const sorted = [...coordinates].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((coordinate) => (
        <CoordinateCard
          key={coordinate.id}
          coordinate={coordinate}
          garments={garments}
        />
      ))}
    </div>
  );
};

const CoordinatesPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>コーデ</Trans>
      </h2>
      <Link
        href="/coordinates/new"
        className="hidden items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-600 lg:inline-flex"
      >
        <Plus className="size-4" />
        <Trans>新規作成</Trans>
      </Link>
    </div>

    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        }
      >
        <CoordinatesContent />
      </Suspense>
    </ErrorBoundary>

    <FAB href="/coordinates/new" />
  </div>
);

export default CoordinatesPage;

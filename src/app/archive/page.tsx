"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { ArrowLeft, Shirt, User } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { dollsAtom } from "@/stores/dollAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import GarmentGrid from "@/components/garment/GarmentGrid";
import DollCard from "@/components/doll/DollCard";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

type TabValue = "garment" | "doll";

const isTabValue = (value: string): value is TabValue =>
  value === "garment" || value === "doll";

const ArchiveContent = () => {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") ?? "garment";
  const activeTab: TabValue = isTabValue(tabParam) ? tabParam : "garment";

  const garments = useAtomValue(garmentsAtom);
  const dolls = useAtomValue(dollsAtom);

  const archivedGarments = useMemo(
    () =>
      garments
        .filter((g) => g.archivedAt !== undefined)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
    [garments],
  );
  const archivedDolls = useMemo(
    () =>
      dolls
        .filter((d) => d.archivedAt !== undefined)
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0)),
    [dolls],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Link
          href="/archive?tab=garment"
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "garment"
              ? "bg-primary-500 text-text-inverse"
              : "bg-surface-overlay text-text-secondary border border-border-default hover:bg-primary-50",
          )}
        >
          <Trans>服 ({archivedGarments.length})</Trans>
        </Link>
        <Link
          href="/archive?tab=doll"
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            activeTab === "doll"
              ? "bg-primary-500 text-text-inverse"
              : "bg-surface-overlay text-text-secondary border border-border-default hover:bg-primary-50",
          )}
        >
          <Trans>ドール ({archivedDolls.length})</Trans>
        </Link>
      </div>

      {activeTab === "garment" ? (
        archivedGarments.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title={t`アーカイブは空です`}
            description={t`アーカイブした服はここに表示されます`}
          />
        ) : (
          <GarmentGrid garments={archivedGarments} />
        )
      ) : archivedDolls.length === 0 ? (
        <EmptyState
          icon={User}
          title={t`アーカイブは空です`}
          description={t`アーカイブしたドールはここに表示されます`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {archivedDolls.map((doll) => (
            <DollCard key={doll.id} doll={doll} />
          ))}
        </div>
      )}
    </div>
  );
};

const ArchivePage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center gap-3 animate-[fade-in_0.4s_ease-out]">
      <Link
        href="/garments"
        className="flex size-8 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-primary-50"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <h2 className="font-display text-xl font-bold">
        <Trans>アーカイブ</Trans>
      </h2>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <ArchiveContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default ArchivePage;

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Plus, User, Archive } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { dollsAtom } from "@/stores/dollAtoms";
import { pendingArchivesAtom } from "@/stores/pendingArchiveAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollCard from "@/components/doll/DollCard";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

const DollListContent = () => {
  const router = useRouter();
  const allDolls = useAtomValue(dollsAtom);
  const pendingArchives = useAtomValue(pendingArchivesAtom);

  const pendingDollIds = new Set(
    pendingArchives.filter((p) => p.entityType === "doll").map((p) => p.id),
  );
  const dolls = allDolls.filter(
    (d) => d.archivedAt === undefined && !pendingDollIds.has(d.id),
  );

  if (allDolls.length === 0) {
    return (
      <EmptyState
        icon={User}
        title={t`まだドールがいません`}
        description={t`最初のドールを登録してみましょう`}
        actionLabel={t`ドールを登録`}
        onAction={() => {
          router.push("/dolls/new");
        }}
      />
    );
  }

  const archivedCount = allDolls.filter(
    (d) => d.archivedAt !== undefined,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {archivedCount > 0 && (
        <Link
          href="/archive?tab=doll"
          className="inline-flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <Archive className="size-3.5" />
          <Trans>アーカイブ ({archivedCount})</Trans>
        </Link>
      )}
      {dolls.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-tertiary">
          <Trans>表示するドールがありません</Trans>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {dolls.map((doll) => (
            <DollCard key={doll.id} doll={doll} />
          ))}
        </div>
      )}
    </div>
  );
};

const DollsPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="flex items-center justify-between animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>ドール一覧</Trans>
      </h2>
      <Link
        href="/dolls/new"
        className="hidden items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-600 lg:inline-flex"
      >
        <Plus className="size-4" />
        <Trans>ドールを登録</Trans>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <DollListContent />
      </Suspense>
    </ErrorBoundary>

    <Link
      href="/dolls/new"
      className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95 lg:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <Plus className="size-6" />
    </Link>
  </div>
);

export default DollsPage;

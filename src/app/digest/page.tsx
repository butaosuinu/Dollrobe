"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Skeleton from "@/components/ui/Skeleton";
import DigestCard from "@/components/digest/DigestCard";
import { digestListAtom } from "@/stores/digestAtoms";

const SKELETON_COUNT = 3;

const DigestListContent = () => {
  const digests = useAtomValue(digestListAtom);

  if (digests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-text-secondary">
          <Trans>まだレポートがありません</Trans>
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          <Trans>毎週月曜日に自動生成されます</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {digests.map((digest) => (
        <DigestCard key={digest.id} digest={digest} />
      ))}
    </div>
  );
};

const DigestListLoading = () => (
  <div className="flex flex-col gap-4">
    {Array.from({ length: SKELETON_COUNT }, (_, i) => (
      <Skeleton key={i} className="h-36 rounded-xl" />
    ))}
  </div>
);

const DigestPage = () => (
  <div className="flex flex-col gap-6 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>週間レポート</Trans>
      </h2>
      <p className="text-sm text-text-secondary">
        <Trans>ワードローブの状況をお伝えします</Trans>
      </p>
    </div>

    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense fallback={<DigestListLoading />}>
        <DigestListContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default DigestPage;

"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { dollsAtom } from "@/stores/dollAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollDetail from "@/components/doll/DollDetail";
import CompatibleGarmentList from "@/components/doll/CompatibleGarmentList";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const DollDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const dolls = useAtomValue(dollsAtom);
  const doll = dolls.find((d) => d.id === params.id);

  if (doll === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-text-secondary">
          <Trans>ドールが見つかりません</Trans>
        </p>
        <button
          onClick={() => router.push("/dolls")}
          className="text-sm font-medium text-primary-500"
        >
          <Trans>一覧に戻る</Trans>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <DollDetail doll={doll} />

      <div className="flex flex-col gap-3">
        <h3 className="font-display text-lg font-bold">
          <Trans>着用可能な服</Trans>
        </h3>
        <ErrorBoundary
          fallback={
            <p className="text-sm text-danger">
              <Trans>読み込みに失敗しました</Trans>
            </p>
          }
        >
          <Suspense
            fallback={
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            }
          >
            <CompatibleGarmentList dollBodySize={doll.bodySize} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

const DollDetailPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-5xl">
      <PageHeader
        title={<Trans>詳細</Trans>}
        onBack={() => router.back()}
        size="md"
      />

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <DollDetailContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default DollDetailPage;

"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import GarmentForm from "@/components/garment/GarmentForm";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

const GarmentEditContent = () => {
  const params = useParams();
  const router = useRouter();
  const garments = useAtomValue(garmentsAtom);
  const garment = garments.find((g) => g.id === params.id);

  if (garment === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-text-secondary">
          <Trans>服が見つかりません</Trans>
        </p>
        <button
          onClick={() => router.push("/garments")}
          className="text-sm font-medium text-primary-500"
        >
          <Trans>一覧に戻る</Trans>
        </button>
      </div>
    );
  }

  return <GarmentForm garment={garment} />;
};

const GarmentEditPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
      <PageHeader
        title={<Trans>服を編集</Trans>}
        onBack={() => router.back()}
        backLabel="戻る"
        animated
      />

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-96" />}>
          <GarmentEditContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default GarmentEditPage;

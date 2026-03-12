"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import GarmentDetail from "@/components/garment/GarmentDetail";
import Skeleton from "@/components/ui/Skeleton";

const GarmentDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const garments = useAtomValue(garmentsAtom);
  const garment = garments.find((g) => g.id === params.id);

  if (garment === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-text-secondary">服が見つかりません</p>
        <button
          onClick={() => router.push("/garments")}
          className="text-sm font-medium text-primary-500"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  return <GarmentDetail garment={garment} />;
};

const GarmentDetailPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="font-display text-lg font-bold">詳細</h2>
      </div>

      <ErrorBoundary
        fallback={<p className="text-sm text-danger">読み込みに失敗しました</p>}
      >
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <GarmentDetailContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default GarmentDetailPage;

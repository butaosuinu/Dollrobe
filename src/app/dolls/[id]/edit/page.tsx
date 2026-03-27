"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { dollsAtom } from "@/stores/dollAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import DollForm from "@/components/doll/DollForm";
import Skeleton from "@/components/ui/Skeleton";

const DollEditContent = () => {
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

  return <DollForm doll={doll} />;
};

const DollEditPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:max-w-2xl">
      <div className="flex items-center gap-3 animate-[fade-in_0.4s_ease-out]">
        <button
          onClick={() => router.back()}
          aria-label="戻る"
          className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="font-display text-xl font-bold">
          <Trans>ドールを編集</Trans>
        </h2>
      </div>

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-96" />}>
          <DollEditContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default DollEditPage;

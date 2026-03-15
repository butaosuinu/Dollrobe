"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Printer } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import QrLabel from "@/components/qr/QrLabel";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

const handlePrint = () => {
  window.print();
};

const PrintContent = () => {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const ids = searchParams.getAll("ids");
  const nameList = searchParams.getAll("names");

  if (
    type === null ||
    (type !== "garment" && type !== "location") ||
    ids.length === 0
  ) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-sm text-text-tertiary">
          <Trans>印刷する QR コードが選択されていません</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display text-xl font-bold">
          <Trans>QR ラベル印刷</Trans>
        </h2>
        <Button variant="primary" onClick={handlePrint}>
          <Printer className="size-4" />
          <Trans>印刷</Trans>
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-2 print:gap-1">
        {ids.map((id, index) => (
          <QrLabel key={id} type={type} id={id} name={nameList[index] ?? id} />
        ))}
      </div>
    </div>
  );
};

const PrintPage = () => (
  <div className="p-4">
    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>ページの読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default PrintPage;

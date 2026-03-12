"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Printer } from "lucide-react";
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
          印刷する QR コードが選択されていません
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display text-xl font-bold">QR ラベル印刷</h2>
        <Button variant="primary" onClick={handlePrint}>
          <Printer className="size-4" />
          印刷
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
        <p className="text-sm text-danger">ページの読み込みに失敗しました</p>
      }
    >
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PrintContent />
      </Suspense>
    </ErrorBoundary>
  </div>
);

export default PrintPage;

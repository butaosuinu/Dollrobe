"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { qrDataUrlAtom } from "@/stores/qrAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import Skeleton from "@/components/ui/Skeleton";

type QrImageProps = {
  readonly type: "garment" | "location";
  readonly id: string;
};

const QrImage = ({ type, id }: QrImageProps) => {
  const dataUrl = useAtomValue(qrDataUrlAtom({ type, id }));
  return <img src={dataUrl} alt="QR コード" className="size-full" />;
};

type Props = {
  readonly type: "garment" | "location";
  readonly id: string;
  readonly name: string;
  readonly subtitle?: string;
};

const QrLabel = ({ type, id, name, subtitle }: Props) => (
  <div className="flex flex-col items-center gap-1 p-2">
    <div className="size-32">
      <ErrorBoundary
        fallback={<p className="text-xs text-danger">QR 生成エラー</p>}
      >
        <Suspense fallback={<Skeleton className="size-full" />}>
          <QrImage type={type} id={id} />
        </Suspense>
      </ErrorBoundary>
    </div>
    <p className="text-center text-xs font-medium text-text-primary">{name}</p>
    {subtitle !== undefined && (
      <p className="text-center text-[10px] text-text-tertiary">{subtitle}</p>
    )}
  </div>
);

export default QrLabel;

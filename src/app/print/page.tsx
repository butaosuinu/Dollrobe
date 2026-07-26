"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { Printer } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import QrLabel from "@/components/qr/QrLabel";
import Button from "@/components/ui/Button";
import ErrorAlert from "@/components/ui/ErrorAlert";
import Skeleton from "@/components/ui/Skeleton";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { storageLocationsAtom } from "@/stores/locationAtoms";

type PrintTarget = {
  readonly id: string;
  readonly name: string;
};

const handlePrint = () => {
  window.print();
};

type PrintTargetsProps = {
  readonly type: "garment" | "location";
  readonly targets: readonly PrintTarget[];
  readonly knownIds: ReadonlySet<string>;
};

const PrintTargets = ({ type, targets, knownIds }: PrintTargetsProps) => {
  const foundTargets = targets.filter((target) => knownIds.has(target.id));
  const missingIds = targets
    .filter((target) => !knownIds.has(target.id))
    .map((target) => target.id);
  const missingLabel = missingIds.join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <h2 className="font-display text-xl font-bold">
          <Trans>QR ラベル印刷</Trans>
        </h2>
        <Button
          variant="primary"
          onClick={handlePrint}
          disabled={foundTargets.length === 0}
        >
          <Printer className="size-4" />
          <Trans>印刷</Trans>
        </Button>
      </div>

      {missingIds.length > 0 && (
        <div className="print:hidden">
          <ErrorAlert>
            <Trans>
              登録されていない ID のため印刷対象から除外しました（
              {missingLabel}）
            </Trans>
          </ErrorAlert>
        </div>
      )}

      {foundTargets.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-tertiary print:hidden">
          <Trans>印刷できる QR コードがありません</Trans>
        </p>
      ) : (
        <div className="grid grid-cols-5 gap-2 print:gap-1">
          {foundTargets.map((target) => (
            <QrLabel
              key={target.id}
              type={type}
              id={target.id}
              name={target.name}
            />
          ))}
        </div>
      )}
    </div>
  );
};

type TargetsProps = {
  readonly targets: readonly PrintTarget[];
};

const GarmentPrintTargets = ({ targets }: TargetsProps) => {
  const garments = useAtomValue(garmentsAtom);
  return (
    <PrintTargets
      type="garment"
      targets={targets}
      knownIds={new Set(garments.map((garment) => garment.id))}
    />
  );
};

const LocationPrintTargets = ({ targets }: TargetsProps) => {
  const storageLocations = useAtomValue(storageLocationsAtom);
  return (
    <PrintTargets
      type="location"
      targets={targets}
      knownIds={new Set(storageLocations.map((location) => location.id))}
    />
  );
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

  const targets = ids.map((id, index) => ({
    id,
    name: nameList[index] ?? id,
  }));

  return type === "garment" ? (
    <GarmentPrintTargets targets={targets} />
  ) : (
    <LocationPrintTargets targets={targets} />
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

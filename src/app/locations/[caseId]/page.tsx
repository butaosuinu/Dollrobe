"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { getConfidence } from "@/lib/confidence";
import {
  CONFIDENCE_THRESHOLD,
  GARMENT_STATUS,
  STORAGE_CASE_TYPE,
} from "@/lib/constants";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StorageGrid from "@/components/location/StorageGrid";
import GarmentList from "@/components/garment/GarmentList";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

const CaseDetailContent = () => {
  const params = useParams();
  const router = useRouter();
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const garments = useAtomValue(garmentsAtom);

  const storageCase = cases.find((c) => c.id === params.caseId);

  if (storageCase === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-text-secondary">
          <Trans>ケースが見つかりません</Trans>
        </p>
        <button
          onClick={() => router.push("/locations")}
          className="text-sm font-medium text-primary-500"
        >
          <Trans>一覧に戻る</Trans>
        </button>
      </div>
    );
  }

  const caseLocations = locations.filter((l) => l.caseId === storageCase.id);
  const locationIds = new Set(caseLocations.map((l) => l.id));
  const caseGarments = garments.filter(
    (g) => g.locationId !== undefined && locationIds.has(g.locationId),
  );
  const needsReviewCount = caseGarments.filter(
    (g) =>
      g.status === GARMENT_STATUS.STORED &&
      getConfidence(g) < CONFIDENCE_THRESHOLD.CONFIRMED,
  ).length;

  const isUnit = storageCase.type === STORAGE_CASE_TYPE.UNIT;

  return (
    <>
      {storageCase.description !== undefined && (
        <p className="text-sm text-text-tertiary">{storageCase.description}</p>
      )}
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-tertiary">
          {isUnit ? (
            <Trans>ボックス</Trans>
          ) : (
            <Trans>
              {storageCase.rows}行 x {storageCase.cols}列
            </Trans>
          )}
        </span>
        <Badge>{t`${caseGarments.length}着`}</Badge>
        {needsReviewCount > 0 && (
          <Badge variant="uncertain">{t`${needsReviewCount}着 要確認`}</Badge>
        )}
      </div>
      {isUnit ? (
        caseGarments.length > 0 ? (
          <GarmentList garments={caseGarments} />
        ) : (
          <p className="py-8 text-center text-sm text-text-tertiary">
            <Trans>このボックスには服がありません</Trans>
          </p>
        )
      ) : (
        <StorageGrid
          storageCase={storageCase}
          locations={caseLocations}
          garments={garments}
        />
      )}
    </>
  );
};

const CaseDetailPage = () => {
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
        <h2 className="font-display text-lg font-bold">
          <Trans>ケース詳細</Trans>
        </h2>
      </div>

      <ErrorBoundary
        fallback={
          <p className="text-sm text-danger">
            <Trans>読み込みに失敗しました</Trans>
          </p>
        }
      >
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <CaseDetailContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default CaseDetailPage;

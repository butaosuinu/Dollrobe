"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { plural } from "@lingui/core/macro";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import { confirmAllByMemoryAtom, garmentsAtom } from "@/stores/garmentAtoms";
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
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";
import type { Garment, StorageLocation } from "@/types";

type UnitCaseBodyProps = {
  readonly garments: readonly Garment[];
  readonly unitLocation: StorageLocation | undefined;
};

const UnitCaseBody = ({ garments, unitLocation }: UnitCaseBodyProps) => {
  const confirmByMemory = useSetAtom(confirmAllByMemoryAtom);
  const hasStored = garments.some(
    (g) => g.status === GARMENT_STATUS.STORED && g.archivedAt === undefined,
  );

  const handleMemoryConfirm = async () => {
    if (unitLocation === undefined) return;
    await confirmByMemory(unitLocation.id);
  };

  return (
    <>
      {garments.length > 0 ? (
        <GarmentList garments={garments} />
      ) : (
        <p className="py-8 text-center text-sm text-text-tertiary">
          <Trans>このボックスには服がありません</Trans>
        </p>
      )}
      {hasStored && unitLocation !== undefined && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" fullWidth onClick={handleMemoryConfirm}>
            <Trans>今ここにいなくても確認</Trans>
          </Button>
          <p className="text-center text-xs text-text-tertiary">
            <Trans>QR 確認より信頼度は控えめに戻ります（約0.5）</Trans>
          </p>
        </div>
      )}
    </>
  );
};

const CaseDetailContent = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const garments = useAtomValue(garmentsAtom);

  const storageCase = cases.find((c) => c.id === params.caseId);
  const initialLocationId = searchParams.get("location") ?? undefined;

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
  const visitedAtById = new Map(
    caseLocations.map((l) => [l.id, l.lastVisitedAt]),
  );
  const caseGarments = garments.filter(
    (g) => g.locationId !== undefined && locationIds.has(g.locationId),
  );
  const needsReviewCount = caseGarments.filter(
    (g) =>
      g.status === GARMENT_STATUS.STORED &&
      getConfidence({
        ...g,
        lastLocationVisitedAt:
          g.locationId !== undefined
            ? visitedAtById.get(g.locationId)
            : undefined,
      }) < CONFIDENCE_THRESHOLD.CONFIRMED,
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
        <Badge>
          {plural(caseGarments.length, { one: "#着", other: "#着" })}
        </Badge>
        {needsReviewCount > 0 && (
          <Badge variant="uncertain">
            {plural(needsReviewCount, {
              one: "#着 要確認",
              other: "#着 要確認",
            })}
          </Badge>
        )}
      </div>
      {isUnit ? (
        <UnitCaseBody garments={caseGarments} unitLocation={caseLocations[0]} />
      ) : (
        <StorageGrid
          storageCase={storageCase}
          locations={caseLocations}
          garments={garments}
          initialSelectedLocationId={initialLocationId}
        />
      )}
    </>
  );
};

const CaseDetailPage = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={<Trans>ケース詳細</Trans>}
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
          <CaseDetailContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default CaseDetailPage;

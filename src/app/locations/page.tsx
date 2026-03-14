"use client";

import { Suspense } from "react";
import { useAtomValue } from "jotai";
import { LayoutGrid, Plus } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { storageCasesAtom, storageLocationsAtom } from "@/stores/locationAtoms";
import { garmentsAtom } from "@/stores/garmentAtoms";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import StorageCaseCard from "@/components/location/StorageCaseCard";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";

const LocationsContent = () => {
  const cases = useAtomValue(storageCasesAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const garments = useAtomValue(garmentsAtom);

  if (cases.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title={t`まだ収納場所がありません`}
        description={t`衣装ケースを追加して、服の収納場所を管理しましょう`}
        actionLabel={t`ケースを追加`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cases.map((storageCase) => {
        const caseLocations = locations.filter(
          (l) => l.caseId === storageCase.id,
        );
        return (
          <StorageCaseCard
            key={storageCase.id}
            storageCase={storageCase}
            locations={caseLocations}
            garments={garments}
          />
        );
      })}
    </div>
  );
};

const LocationsPage = () => (
  <div className="flex flex-col gap-4 p-4">
    <div className="animate-[fade-in_0.4s_ease-out]">
      <h2 className="font-display text-xl font-bold">
        <Trans>収納場所</Trans>
      </h2>
    </div>

    <ErrorBoundary
      fallback={
        <p className="text-sm text-danger">
          <Trans>読み込みに失敗しました</Trans>
        </p>
      }
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        }
      >
        <LocationsContent />
      </Suspense>
    </ErrorBoundary>

    <button className="fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95">
      <Plus className="size-6" />
    </button>
  </div>
);

export default LocationsPage;

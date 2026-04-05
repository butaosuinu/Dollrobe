"use client";

import { useCallback, useEffect, useState } from "react";

import { useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { ScanConfirmation } from "@/types";
import {
  activeLocationIdAtom,
  scannedGarmentIdsAtom,
  resetScanSessionAtom,
  reviewDialogOpenAtom,
} from "@/stores/scanSessionAtoms";
import {
  activeGarmentsAtom,
  confirmAllGarmentsAtom,
  confirmPartialGarmentsAtom,
} from "@/stores/garmentAtoms";
import { storageLocationsAtom } from "@/stores/locationAtoms";
import { QR_SCHEME } from "@/lib/constants";
import { getItemsNeedingReview } from "@/lib/confidence";
import { useNfcReader } from "@/hooks/useNfcReader";
import { useNfcSupported } from "@/hooks/useNfcSupported";
import QrScanner from "@/components/scan/QrScanner";
import ScanResult from "@/components/scan/ScanResult";
import ScanSessionPanel from "@/components/scan/ScanSessionPanel";
import NfcCapabilityBadge from "@/components/scan/NfcCapabilityBadge";
import NfcReader from "@/components/scan/NfcReader";
import OpportunisticReviewDialog from "@/components/scan/OpportunisticReviewDialog";

const ScanPage = () => {
  const { i18n } = useLingui();
  const garments = useAtomValue(activeGarmentsAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const activeLocationId = useAtomValue(activeLocationIdAtom);
  const setActiveLocationId = useSetAtom(activeLocationIdAtom);
  const setScannedIds = useSetAtom(scannedGarmentIdsAtom);
  const confirmAll = useSetAtom(confirmAllGarmentsAtom);
  const confirmPartial = useSetAtom(confirmPartialGarmentsAtom);
  const resetSession = useSetAtom(resetScanSessionAtom);
  const reviewDialogOpen = useAtomValue(reviewDialogOpenAtom);
  const setReviewDialogOpen = useSetAtom(reviewDialogOpenAtom);

  const nfcSupported = useNfcSupported();

  const [lastScan, setLastScan] = useState<
    | { type: "garment" | "location"; name: string; subtitle?: string }
    | undefined
  >(undefined);

  const activeLocation = locations.find((l) => l.id === activeLocationId);

  const handleScan = useCallback(
    (data: string) => {
      if (data.startsWith(QR_SCHEME.LOCATION_PREFIX)) {
        const locationId = data.slice(QR_SCHEME.LOCATION_PREFIX.length);
        setActiveLocationId(locationId);
        const loc = locations.find((l) => l.id === locationId);
        setLastScan({
          type: "location",
          name: loc?.label ?? locationId,
          subtitle: i18n._(msg`場所を設定しました`),
        });

        const needsReview = getItemsNeedingReview(garments, locationId);
        if (needsReview.length > 0) {
          setReviewDialogOpen(true);
        }
        return;
      }

      if (data.startsWith(QR_SCHEME.GARMENT_PREFIX)) {
        const garmentId = data.slice(QR_SCHEME.GARMENT_PREFIX.length);
        setScannedIds((prev) =>
          prev.includes(garmentId) ? prev : [...prev, garmentId],
        );
        const garment = garments.find((g) => g.id === garmentId);
        setLastScan({
          type: "garment",
          name: garment?.name ?? garmentId,
          subtitle: i18n._(msg`スキャンしました`),
        });
      }
    },
    [
      locations,
      garments,
      setActiveLocationId,
      setScannedIds,
      setReviewDialogOpen,
      i18n,
    ],
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MODE === "true") {
      window.__e2eSimulateScan = handleScan;
      window.__e2eScanLocationsLoaded = locations.length;
      return () => {
        window.__e2eSimulateScan = undefined;
      };
    }
  }, [handleScan, locations.length]);

  const { nfcState } = useNfcReader({
    onScan: handleScan,
    isActive: !reviewDialogOpen && nfcSupported,
  });

  const handleConfirmAll = async () => {
    if (activeLocationId === undefined) return;
    await confirmAll(activeLocationId);
    resetSession();
    setLastScan(undefined);
  };

  const itemsNeedingReview =
    activeLocationId !== undefined
      ? getItemsNeedingReview(garments, activeLocationId)
      : [];

  const handleReviewConfirmAll = async () => {
    if (activeLocationId === undefined) return;
    await confirmAll(activeLocationId);
    setReviewDialogOpen(false);
  };

  const handleReviewConfirmPartial = async (
    confirmations: readonly ScanConfirmation[],
  ) => {
    await confirmPartial(confirmations);
    setReviewDialogOpen(false);
  };

  const handleReviewClose = () => {
    setReviewDialogOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="animate-[fade-in_0.4s_ease-out]">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold">
            <Trans>スキャン</Trans>
          </h2>
          <NfcCapabilityBadge />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="lg:max-w-md lg:justify-self-center">
          <div className="flex flex-col gap-3">
            <QrScanner onScan={handleScan} isActive={!reviewDialogOpen} />
            {nfcSupported && <NfcReader nfcState={nfcState} />}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {lastScan !== undefined && (
            <ScanResult
              type={lastScan.type}
              name={lastScan.name}
              subtitle={lastScan.subtitle}
            />
          )}

          <ScanSessionPanel
            locationName={activeLocation?.label}
            onConfirmAll={handleConfirmAll}
          />
        </div>
      </div>

      <OpportunisticReviewDialog
        isOpen={reviewDialogOpen}
        onClose={handleReviewClose}
        itemsNeedingReview={itemsNeedingReview}
        onConfirmAll={handleReviewConfirmAll}
        onConfirmPartial={handleReviewConfirmPartial}
      />
    </div>
  );
};

export default ScanPage;

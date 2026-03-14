"use client";

import { useCallback, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import {
  activeLocationIdAtom,
  scannedGarmentIdsAtom,
  resetScanSessionAtom,
} from "@/stores/scanSessionAtoms";
import { confirmAllGarmentsAtom, garmentsAtom } from "@/stores/garmentAtoms";
import { storageLocationsAtom } from "@/stores/locationAtoms";
import { QR_SCHEME } from "@/lib/constants";
import QrScanner from "@/components/scan/QrScanner";
import ScanResult from "@/components/scan/ScanResult";
import ScanSessionPanel from "@/components/scan/ScanSessionPanel";

const ScanPage = () => {
  const { i18n } = useLingui();
  const garments = useAtomValue(garmentsAtom);
  const locations = useAtomValue(storageLocationsAtom);
  const activeLocationId = useAtomValue(activeLocationIdAtom);
  const setActiveLocationId = useSetAtom(activeLocationIdAtom);
  const setScannedIds = useSetAtom(scannedGarmentIdsAtom);
  const confirmAll = useSetAtom(confirmAllGarmentsAtom);
  const resetSession = useSetAtom(resetScanSessionAtom);

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
    [locations, garments, setActiveLocationId, setScannedIds, i18n],
  );

  const handleConfirmAll = async () => {
    if (activeLocationId === undefined) return;
    await confirmAll(activeLocationId);
    resetSession();
    setLastScan(undefined);
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="animate-[fade-in_0.4s_ease-out]">
        <h2 className="font-display text-xl font-bold">
          <Trans>QRスキャン</Trans>
        </h2>
      </div>

      <QrScanner onScan={handleScan} isActive />

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
  );
};

export default ScanPage;

"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { MapPin, RotateCcw } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import {
  activeLocationIdAtom,
  scannedGarmentIdsAtom,
  resetScanSessionAtom,
} from "@/stores/scanSessionAtoms";
import Button from "@/components/ui/Button";

type Props = {
  readonly locationName: string | undefined;
  readonly onConfirmAll: () => void;
};

const ScanSessionPanel = ({ locationName, onConfirmAll }: Props) => {
  const activeLocationId = useAtomValue(activeLocationIdAtom);
  const scannedIds = useAtomValue(scannedGarmentIdsAtom);
  const resetSession = useSetAtom(resetScanSessionAtom);

  if (activeLocationId === undefined) {
    return (
      <div className="rounded-xl bg-surface-overlay/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 text-text-secondary">
          <MapPin className="size-5 shrink-0" />
          <p className="text-sm">
            <Trans>場所のQRをスキャンして、収納場所を設定してください</Trans>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-overlay/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary-100">
            <MapPin className="size-4 text-primary-600" />
          </div>
          <div>
            <p className="text-xs text-text-tertiary">
              <Trans>スキャン中の場所</Trans>
            </p>
            <p className="text-sm font-bold">
              {locationName ?? activeLocationId}
            </p>
          </div>
        </div>
        <button
          onClick={() => resetSession()}
          className="flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
        >
          <RotateCcw className="size-3" />
          <Trans>リセット</Trans>
        </button>
      </div>

      {scannedIds.length > 0 && (
        <p className="text-xs text-text-secondary">
          <Trans>{scannedIds.length}着をスキャンしました</Trans>
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="primary" size="sm" fullWidth onClick={onConfirmAll}>
          <Trans>この場所の全服を確認済みにする</Trans>
        </Button>
      </div>
    </div>
  );
};

export default ScanSessionPanel;

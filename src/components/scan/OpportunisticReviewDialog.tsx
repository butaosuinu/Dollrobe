"use client";

import { useState } from "react";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { ArrowLeft } from "lucide-react";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import ReviewItemRow from "@/components/scan/ReviewItemRow";
import type { Garment, ScanConfirmation } from "@/types";

type ReviewMode = "overview" | "individual";

type Props = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly itemsNeedingReview: readonly Garment[];
  readonly lastLocationVisitedAt?: number;
  readonly onConfirmAll: () => void;
  readonly onConfirmPartial: (
    confirmations: readonly ScanConfirmation[],
  ) => void;
};

const OpportunisticReviewDialog = ({
  isOpen,
  onClose,
  itemsNeedingReview,
  lastLocationVisitedAt,
  onConfirmAll,
  onConfirmPartial,
}: Props) => {
  const { i18n } = useLingui();
  const [mode, setMode] = useState<ReviewMode>("overview");
  const [confirmationMap, setConfirmationMap] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map());

  const handleEnterIndividualMode = () => {
    setConfirmationMap(new Map(itemsNeedingReview.map((g) => [g.id, true])));
    setMode("individual");
  };

  const handleToggle = (garmentId: string, confirmed: boolean) => {
    setConfirmationMap((prev) => new Map([...prev, [garmentId, confirmed]]));
  };

  const handleConfirmPartial = () => {
    const confirmations: readonly ScanConfirmation[] = itemsNeedingReview.map(
      (g) => ({
        garmentId: g.id,
        confirmed: confirmationMap.get(g.id) ?? true,
      }),
    );
    onConfirmPartial(confirmations);
  };

  const handleBackToOverview = () => {
    setMode("overview");
  };

  const title =
    mode === "overview"
      ? i18n._(msg`要確認のアイテム（${itemsNeedingReview.length}件）`)
      : i18n._(msg`個別確認`);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      {mode === "overview" && (
        <div className="flex flex-col gap-3">
          <div>
            {itemsNeedingReview.map((garment) => (
              <ReviewItemRow
                key={garment.id}
                garment={garment}
                mode="overview"
                lastLocationVisitedAt={lastLocationVisitedAt}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" fullWidth onClick={onConfirmAll}>
              <Trans>全部ある</Trans>
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleEnterIndividualMode}
            >
              <Trans>ズレを直す</Trans>
            </Button>
          </div>
        </div>
      )}
      {mode === "individual" && (
        <div className="flex flex-col gap-3">
          <div>
            {itemsNeedingReview.map((garment) => (
              <ReviewItemRow
                key={garment.id}
                garment={garment}
                mode="individual"
                lastLocationVisitedAt={lastLocationVisitedAt}
                isConfirmed={confirmationMap.get(garment.id) ?? true}
                onToggle={handleToggle}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="primary" fullWidth onClick={handleConfirmPartial}>
              <Trans>確定する</Trans>
            </Button>
            <Button variant="ghost" fullWidth onClick={handleBackToOverview}>
              <ArrowLeft className="size-4" />
              <Trans>戻る</Trans>
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default OpportunisticReviewDialog;

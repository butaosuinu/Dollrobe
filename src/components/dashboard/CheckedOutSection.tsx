"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { Archive, Clock, Shirt, XCircle } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { activeGarmentsAtom } from "@/stores/garmentAtoms";
import { resolveStillUsingAtom, resolveLostAtom } from "@/stores/orphanAtoms";
import { getElapsedDays } from "@/lib/confidence";
import {
  GARMENT_STATUS,
  ORPHAN_CHECKOUT_THRESHOLD_DAYS,
} from "@/lib/constants";
import Button from "@/components/ui/Button";
import ConfirmSheet from "@/components/ui/ConfirmSheet";
import type { Garment } from "@/types";

type CheckedOutItemProps = {
  readonly garment: Garment;
  readonly elapsedDays: number;
  readonly isOrphaned: boolean;
  readonly onStoredBack: () => void;
  readonly onStillUsing: () => void;
  readonly onLost: () => void;
};

const CheckedOutItem = ({
  garment,
  elapsedDays,
  isOrphaned,
  onStoredBack,
  onStillUsing,
  onLost,
}: CheckedOutItemProps) => (
  <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-overlay p-4">
    <div className="flex items-center gap-3">
      {garment.imageUrl !== undefined ? (
        <img
          src={garment.imageUrl}
          alt={garment.name}
          className="size-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-50">
          <Shirt className="size-6 text-primary-400" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-bold text-text-primary">{garment.name}</p>
        <p className="text-xs text-text-secondary">
          <Trans>{elapsedDays}日前から取り出し中</Trans>
        </p>
      </div>
    </div>
    {isOrphaned && (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onStoredBack}>
          <Archive className="size-3.5" />
          <Trans>しまった</Trans>
        </Button>
        <Button variant="ghost" size="sm" onClick={onStillUsing}>
          <Clock className="size-3.5" />
          <Trans>使用中</Trans>
        </Button>
        <Button variant="danger" size="sm" onClick={onLost}>
          <XCircle className="size-3.5" />
          <Trans>紛失</Trans>
        </Button>
      </div>
    )}
  </div>
);

const CheckedOutSection = () => {
  const garments = useAtomValue(activeGarmentsAtom);
  const resolveStillUsing = useSetAtom(resolveStillUsingAtom);
  const resolveLost = useSetAtom(resolveLostAtom);
  const router = useRouter();
  const { i18n } = useLingui();

  const [lostTarget, setLostTarget] = useState<Garment | undefined>(undefined);

  const checkedOut = garments
    .flatMap((g) =>
      g.status === GARMENT_STATUS.CHECKED_OUT && g.checkedOutAt !== undefined
        ? [{ garment: g, elapsedDays: getElapsedDays(g.checkedOutAt) }]
        : [],
    )
    .sort((a, b) => b.elapsedDays - a.elapsedDays);

  const handleStoredBack = useCallback(() => {
    router.push("/scan");
  }, [router]);

  const handleStillUsing = useCallback(
    (garmentId: string) => {
      resolveStillUsing(garmentId);
    },
    [resolveStillUsing],
  );

  const handleLostClick = useCallback((garment: Garment) => {
    setLostTarget(garment);
  }, []);

  const handleLostConfirm = useCallback(() => {
    if (lostTarget === undefined) return;
    resolveLost(lostTarget.id);
    setLostTarget(undefined);
  }, [lostTarget, resolveLost]);

  const handleLostCancel = useCallback(() => {
    setLostTarget(undefined);
  }, []);

  if (checkedOut.length === 0) {
    return undefined;
  }

  return (
    <section id="checked-out">
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">
        <Trans>取り出し中の服</Trans>
      </h2>
      <div className="flex flex-col gap-3">
        {checkedOut.map(({ garment, elapsedDays }) => {
          const isOrphaned = elapsedDays >= ORPHAN_CHECKOUT_THRESHOLD_DAYS;
          return (
            <CheckedOutItem
              key={garment.id}
              garment={garment}
              elapsedDays={elapsedDays}
              isOrphaned={isOrphaned}
              onStoredBack={handleStoredBack}
              onStillUsing={() => handleStillUsing(garment.id)}
              onLost={() => handleLostClick(garment)}
            />
          );
        })}
      </div>

      <ConfirmSheet
        isOpen={lostTarget !== undefined}
        onClose={handleLostCancel}
        onConfirm={handleLostConfirm}
        title={i18n._(msg`紛失として記録しますか？`)}
        message={
          lostTarget !== undefined
            ? i18n._(
                msg`「${lostTarget.name}」を紛失としてマークします。収納場所の情報はクリアされます。`,
              )
            : ""
        }
        confirmLabel={i18n._(msg`紛失として記録`)}
        confirmVariant="danger"
      />
    </section>
  );
};

export default CheckedOutSection;

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { Archive, Clock, XCircle, Shirt } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import {
  orphanedCheckoutsAtom,
  resolveStillUsingAtom,
  resolveLostAtom,
} from "@/stores/orphanAtoms";
import { getElapsedDays } from "@/lib/confidence";
import BottomSheet from "@/components/ui/BottomSheet";
import Button from "@/components/ui/Button";
import type { Garment } from "@/types";

type OrphanItemProps = {
  readonly garment: Garment;
  readonly onStoredBack: () => void;
  readonly onStillUsing: () => void;
  readonly onLost: () => void;
};

const OrphanItem = ({
  garment,
  onStoredBack,
  onStillUsing,
  onLost,
}: OrphanItemProps) => {
  const elapsedDays =
    garment.checkedOutAt !== undefined
      ? getElapsedDays(garment.checkedOutAt)
      : 0;

  return (
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
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onStoredBack}>
          <Archive className="size-3.5" />
          <Trans>しまった</Trans>
        </Button>
        <Button variant="ghost" size="sm" onClick={onStillUsing}>
          <Clock className="size-3.5" />
          <Trans>まだ使用中</Trans>
        </Button>
        <Button variant="danger" size="sm" onClick={onLost}>
          <XCircle className="size-3.5" />
          <Trans>なくした</Trans>
        </Button>
      </div>
    </div>
  );
};

const OrphanCheckoutDialog = () => {
  const orphans = useAtomValue(orphanedCheckoutsAtom);
  const resolveStillUsing = useSetAtom(resolveStillUsingAtom);
  const resolveLost = useSetAtom(resolveLostAtom);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const pendingOrphans = orphans.filter((g) => !resolvedIds.has(g.id));

  useEffect(() => {
    if (orphans.length > 0) {
      setIsOpen(true);
    }
  }, [orphans.length]);

  useEffect(() => {
    if (pendingOrphans.length === 0 && resolvedIds.size > 0) {
      setIsOpen(false);
    }
  }, [pendingOrphans.length, resolvedIds.size]);

  const handleStoredBack = useCallback(() => {
    router.push("/scan");
    setIsOpen(false);
  }, [router]);

  const handleStillUsing = useCallback(
    (garmentId: string) => {
      resolveStillUsing(garmentId);
      setResolvedIds((prev) => new Set([...prev, garmentId]));
    },
    [resolveStillUsing],
  );

  const handleLost = useCallback(
    (garmentId: string) => {
      resolveLost(garmentId);
      setResolvedIds((prev) => new Set([...prev, garmentId]));
    },
    [resolveLost],
  );

  if (orphans.length === 0) {
    return undefined;
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={`取り出し中の服を確認（${String(pendingOrphans.length)}件）`}
    >
      <div className="flex flex-col gap-3">
        {pendingOrphans.map((garment) => (
          <OrphanItem
            key={garment.id}
            garment={garment}
            onStoredBack={handleStoredBack}
            onStillUsing={() => handleStillUsing(garment.id)}
            onLost={() => handleLost(garment.id)}
          />
        ))}
      </div>
    </BottomSheet>
  );
};

export default OrphanCheckoutDialog;

"use client";

import { useRouter } from "next/navigation";
import { Clock, ChevronRight } from "lucide-react";
import { Plural, Trans } from "@lingui/react/macro";
import clsx from "clsx";
import type { StaleLocation } from "@/stores/dashboardAtoms";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

type Props = {
  readonly item: StaleLocation;
};

const StaleLocationItem = ({ item }: Props) => {
  const router = useRouter();
  const {
    caseId,
    locationId,
    locationLabel,
    caseName,
    uncertainItemCount,
    daysSinceLastVisit,
    neverVisited,
  } = item;

  const handleClick = () => {
    router.push(`/locations/${caseId}?location=${locationId}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl border border-border-default bg-surface-overlay p-4 text-left transition-shadow hover:shadow-md",
        FOCUS_RING_CLASS,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
        <Clock className="size-5 text-primary-500" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-text-primary">
          {caseName} - {locationLabel}
        </p>
        <p className="text-xs text-text-secondary">
          {neverVisited ? (
            <Trans>まだ開けていません</Trans>
          ) : (
            <Trans>{daysSinceLastVisit}日前に最後に開けました</Trans>
          )}
          {" · "}
          <Plural
            value={uncertainItemCount}
            one="未確認 #着"
            other="未確認 #着"
          />
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  );
};

export default StaleLocationItem;

"use client";

import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { staleLocationsSuspenseAtom } from "@/stores/dashboardAtoms";
import StaleLocationItem from "./StaleLocationItem";

const StaleLocationsCard = () => {
  const items = useAtomValue(staleLocationsSuspenseAtom);

  if (items.length === 0) {
    return undefined;
  }

  return (
    <section id="stale-locations">
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">
        <Trans>しばらく開けていない場所</Trans>
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <StaleLocationItem key={item.locationId} item={item} />
        ))}
      </div>
    </section>
  );
};

export default StaleLocationsCard;

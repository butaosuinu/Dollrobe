"use client";

import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { activeGarmentsAtom } from "@/stores/garmentAtoms";
import ConfidenceStats from "@/components/confidence/ConfidenceStats";

const StatsOverview = () => {
  const garments = useAtomValue(activeGarmentsAtom);

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">
        <Trans>ステータス</Trans>
      </h2>
      <ConfidenceStats garments={garments} />
    </section>
  );
};

export default StatsOverview;

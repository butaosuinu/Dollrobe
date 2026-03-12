"use client";

import { useAtomValue } from "jotai";
import { garmentsAtom } from "@/stores/garmentAtoms";
import ConfidenceStats from "@/components/confidence/ConfidenceStats";

const StatsOverview = () => {
  const garments = useAtomValue(garmentsAtom);

  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-bold text-text-secondary">ステータス</h2>
      <ConfidenceStats garments={garments} />
    </section>
  );
};

export default StatsOverview;

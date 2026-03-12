"use client";

import { useAtomValue } from "jotai";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { syncStatusAtom } from "@/stores/syncAtoms";
import { SYNC_STATUS } from "@/lib/constants";

const SyncIndicator = () => {
  const syncStatus = useAtomValue(syncStatusAtom);

  const iconClass = "size-4";

  if (syncStatus === SYNC_STATUS.SYNCING) {
    return <Loader2 className={`${iconClass} animate-spin text-accent-400`} />;
  }
  if (syncStatus === SYNC_STATUS.ERROR) {
    return <CloudOff className={`${iconClass} text-danger`} />;
  }
  return <Cloud className={`${iconClass} text-text-tertiary`} />;
};

const TopBar = () => (
  <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-surface-overlay/80 px-4 backdrop-blur-xl">
    <h1 className="font-display text-lg font-bold tracking-tight text-primary-700">
      Doll Wardrobe
    </h1>
    <SyncIndicator />
  </header>
);

export default TopBar;

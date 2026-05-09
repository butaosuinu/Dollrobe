"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useLingui } from "@lingui/react";
import { syncStatusAtom } from "@/stores/syncAtoms";
import { APP_NAME, SYNC_STATUS } from "@/lib/constants";
import { NAV_ITEMS } from "@/lib/nav-items";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import LocaleSelector from "@/components/settings/LocaleSelector";
import UserMenu from "@/components/auth/UserMenu";

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

const TopBar = () => {
  useOnlineSync();
  const pathname = usePathname();
  const { i18n } = useLingui();

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-overlay/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <h1 className="font-display text-lg font-bold tracking-tight text-primary-700">
            {APP_NAME}
          </h1>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-100 text-primary-700"
                      : "text-text-secondary hover:bg-primary-50 hover:text-text-primary",
                  )}
                >
                  <Icon className="size-4" />
                  {i18n._(label)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <LocaleSelector />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default TopBar;

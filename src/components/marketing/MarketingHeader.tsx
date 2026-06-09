"use client";

import Link from "next/link";
import { Trans, useLingui } from "@lingui/react/macro";
import LocaleSelector from "@/components/settings/LocaleSelector";
import Logo from "@/components/marketing/Logo";
import MarketingCTA from "@/components/marketing/MarketingCTA";
import MarketingNavLinks from "@/components/marketing/MarketingNavLinks";

const MarketingHeader = () => {
  const { t } = useLingui();

  return (
    <header className="sticky top-0 z-40 border-b border-border-default/60 bg-surface-overlay/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Logo size={32} />
          <span className="font-display text-lg font-bold tracking-tight text-primary-700">
            Dollrobe
          </span>
        </Link>
        <nav
          aria-label={t`ページ内ナビゲーション`}
          className="hidden items-center gap-6 md:flex"
        >
          <MarketingNavLinks linkClassName="text-sm font-medium text-text-secondary transition-colors hover:text-primary-700" />
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LocaleSelector />
          <MarketingCTA size="md" className="hidden sm:inline-flex">
            <Trans>始める</Trans>
          </MarketingCTA>
        </div>
      </div>
    </header>
  );
};

export default MarketingHeader;

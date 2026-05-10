"use client";

import Link from "next/link";
import { Trans } from "@lingui/react/macro";
import LocaleSelector from "@/components/settings/LocaleSelector";
import Logo from "@/components/marketing/Logo";
import MarketingCTA from "@/components/marketing/MarketingCTA";

const MarketingHeader = () => (
  <header className="sticky top-0 z-40 border-b border-border-default/60 bg-surface-overlay/80 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
      <Link
        href="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      >
        <Logo size={32} />
        <span className="font-display text-lg font-bold tracking-tight text-primary-700">
          Dollrobe
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <LocaleSelector />
        <MarketingCTA size="md" className="hidden sm:inline-flex">
          <Trans>始める</Trans>
        </MarketingCTA>
      </div>
    </div>
  </header>
);

export default MarketingHeader;

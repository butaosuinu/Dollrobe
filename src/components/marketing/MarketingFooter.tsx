"use client";

import { Trans } from "@lingui/react/macro";
import Logo from "@/components/marketing/Logo";
import LocaleSelector from "@/components/settings/LocaleSelector";
import MarketingCTA from "@/components/marketing/MarketingCTA";
import MarketingNavLinks from "@/components/marketing/MarketingNavLinks";

const MarketingFooter = () => (
  <footer className="relative overflow-hidden border-t border-border-default/60 bg-surface-base">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(ellipse 70% 50% at 50% 0%, oklch(0.88 0.09 290 / 0.25), transparent 70%)",
      }}
    />
    <div className="relative mx-auto max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
      <div className="flex flex-col items-center text-center">
        <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
          <Trans>
            収納の答え合わせを、
            <br className="sm:hidden" />
            スキャン 1 回に。
          </Trans>
        </h2>
        <p className="mt-4 max-w-md text-sm text-text-secondary">
          <Trans>アカウントを作るのに、10 秒もかかりません。</Trans>
        </p>
        <div className="mt-8">
          <MarketingCTA size="lg">
            <Trans>無料で始める</Trans>
          </MarketingCTA>
        </div>
      </div>

      <div className="mt-20 flex flex-col items-start gap-8 border-t border-border-default/60 pt-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="font-display text-base font-bold text-primary-700">
            Dollrobe
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <MarketingNavLinks linkClassName="text-text-secondary transition-colors hover:text-primary-700" />
          <LocaleSelector />
        </nav>
      </div>

      {/* eslint-disable-next-line lingui/no-unlocalized-strings -- copyright + brand name */}
      <p className="mt-8 text-xs text-text-tertiary">© 2026 Dollrobe</p>
    </div>
  </footer>
);

export default MarketingFooter;

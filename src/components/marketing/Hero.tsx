"use client";

import Image from "next/image";
import { useAtomValue } from "jotai";
import { Trans } from "@lingui/react/macro";
import { localeAtom } from "@/i18n/localeAtom";
import MarketingCTA from "@/components/marketing/MarketingCTA";
import { screenshotPath } from "@/components/marketing/screenshotPath";

const Hero = () => {
  const locale = useAtomValue(localeAtom);

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <Image
          src="/lp/photos/hero-bg.webp"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, oklch(0.985 0.005 85 / 0.95) 0%, oklch(0.985 0.005 85 / 0.7) 28%, oklch(0.985 0.005 85 / 0.18) 55%, oklch(0.985 0.005 85 / 0.45) 100%)",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-20 -left-24 size-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.85 0.1 350 / 0.25)" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-32">
        <div className="flex flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-overlay/80 px-4 py-1.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-200 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-primary-500" />
            <Trans>ドール服のための収納管理 PWA</Trans>
          </p>
          <h1 className="font-display text-[2rem] font-bold leading-[1.2] tracking-tight text-text-primary md:text-5xl lg:text-[3.25rem]">
            <Trans>
              スキャンするだけで、
              <br />
              ドール服の場所が
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                ぜんぶ分かる。
              </span>
            </Trans>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
            <Trans>
              QR と NFC
              で、ドール服の収納を半自動で管理。手入力は一切なし。どの引き出しに何があるかが、常に最新の状態に保たれます。
            </Trans>
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <MarketingCTA size="lg">
              <Trans>無料で始める</Trans>
            </MarketingCTA>
            <p className="text-sm text-text-tertiary">
              <Trans>登録は Google / X アカウントで 10 秒</Trans>
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            aria-hidden
            className="absolute -inset-10 rounded-[3rem] opacity-70 blur-3xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.985 0.005 85 / 0.7), oklch(0.72 0.14 350 / 0.35))",
            }}
          />
          <div className="relative mx-auto aspect-[9/19] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-text-primary/90 bg-surface-base shadow-2xl lg:max-w-[360px]">
            <Image
              src={screenshotPath(locale, "dashboard")}
              alt=""
              width={720}
              height={1520}
              unoptimized
              className="size-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

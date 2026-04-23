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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 20% 10%, oklch(0.92 0.08 350 / 0.55), transparent 60%), radial-gradient(ellipse 50% 45% at 85% 80%, oklch(0.88 0.09 290 / 0.45), transparent 65%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-20 -left-24 size-96 rounded-full blur-3xl"
          style={{ background: "oklch(0.85 0.1 350 / 0.35)" }}
        />
        <div
          className="absolute bottom-0 right-0 size-[28rem] translate-x-1/3 translate-y-1/3 rounded-full blur-3xl"
          style={{ background: "oklch(0.8 0.1 290 / 0.3)" }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-32">
        <div className="flex flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-overlay/80 px-4 py-1.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-200 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-primary-500" />
            <Trans>ドール服のための収納管理 PWA</Trans>
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-text-primary md:text-5xl lg:text-6xl">
            <Trans>
              あの服、どこにしまったっけ？
              <br />
              <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                を、終わらせる。
              </span>
            </Trans>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-text-secondary md:text-lg">
            <Trans>
              QR と NFC
              で、ドール服の収納を半自動で管理。手入力は一切なし。スキャンするだけで、
              どこに何があるかが常に最新の状態になります。
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
            className="absolute -inset-8 rounded-[3rem] opacity-60 blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.14 350 / 0.4), oklch(0.65 0.14 290 / 0.35))",
            }}
          />
          <div className="relative mx-auto aspect-[9/19] w-full max-w-[320px] overflow-hidden rounded-[2.5rem] border-[10px] border-text-primary/90 bg-surface-base shadow-2xl lg:max-w-[360px]">
            <Image
              src={screenshotPath(locale, "dashboard")}
              alt=""
              width={720}
              height={1520}
              priority
              sizes="(max-width: 768px) 320px, 360px"
              className="size-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

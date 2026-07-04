"use client";

import Image from "next/image";
import { useAtomValue } from "jotai";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { localeAtom } from "@/i18n/localeAtom";
import {
  screenshotPath,
  type ScreenshotName,
} from "@/components/marketing/screenshotPath";
import { SECTION_ID } from "@/components/marketing/sectionIds";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

const STEPS: ReadonlyArray<{
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly photo: string;
  readonly photoAlt: MessageDescriptor;
  readonly screenshot: ScreenshotName;
  readonly screenshotAlt: MessageDescriptor;
}> = [
  {
    title: msg`ドールと収納場所を登録`,
    body: msg`お迎えしたドールと、衣装を入れる引き出しやケースをアプリに追加します。`,
    photo: "/lp/photos/step-1-register.webp",
    photoAlt: msg`撮影台に並べたドール服とスマホの俯瞰写真`,
    screenshot: "dashboard",
    screenshotAlt: msg`ダッシュボード画面`,
  },
  {
    title: msg`QR / NFC ラベルを印刷して貼る`,
    body: msg`引き出しや服のタグに QR を貼るだけ。NFC シールでも代用できます（Android）。`,
    photo: "/lp/photos/step-2-label.webp",
    photoAlt: msg`ピンセットでラベルを引き出しの縁に貼る場面`,
    screenshot: "locations",
    screenshotAlt: msg`収納グリッド画面`,
  },
  {
    title: msg`服を QR と紐づけて収納`,
    body: msg`服と場所の QR を順番にスキャン。「どこに、何を入れたか」が自動で記録されます。`,
    photo: "/lp/photos/step-3-scan.webp",
    photoAlt: msg`開いた引き出しの上にスマホを構えてスキャンする場面`,
    screenshot: "scan",
    screenshotAlt: msg`スキャン画面`,
  },
  {
    title: msg`以降はスキャンするだけ`,
    body: msg`出し入れの度に場所の QR を読むだけで、居場所が常に最新の状態に保たれます。`,
    photo: "/lp/photos/step-4-routine.webp",
    photoAlt: msg`整然と整理された 12 コンパートメントの引き出し`,
    screenshot: "garments",
    screenshotAlt: msg`ワードローブ画面`,
  },
];

const StepCard = ({
  step,
  index,
}: {
  readonly step: (typeof STEPS)[number];
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const locale = useAtomValue(localeAtom);
  const fade = useFadeInOnView();
  const isReversed = index % 2 === 1;

  return (
    <div
      ref={fade.ref}
      className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${fade.className}`}
      style={fade.style}
    >
      <div className={isReversed ? "lg:order-2" : undefined}>
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-primary-500 font-display text-lg font-bold text-text-inverse shadow-[0_8px_20px_-8px_oklch(0.62_0.17_350_/_0.5)]">
          {String(index + 1).padStart(2, "0")}
        </div>
        <h3 className="mb-3 font-display text-2xl font-bold leading-tight text-text-primary md:text-3xl">
          {i18n._(step.title)}
        </h3>
        <p className="text-base leading-relaxed text-text-secondary">
          {i18n._(step.body)}
        </p>
      </div>
      <div className={isReversed ? "lg:order-1" : undefined}>
        <div className="relative mx-auto w-full max-w-[480px] pb-16 sm:pb-24">
          <div
            aria-hidden
            className="absolute -inset-6 rounded-[3rem] opacity-40 blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.14 350 / 0.3), oklch(0.65 0.14 290 / 0.25))",
            }}
          />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-xl">
            <Image
              src={step.photo}
              alt={i18n._(step.photoAlt)}
              width={1024}
              height={1280}
              unoptimized
              className="size-full object-cover"
            />
          </div>
          <div className="absolute right-0 bottom-0 w-[58%] max-w-[240px] translate-x-3 translate-y-12 sm:translate-x-6 sm:translate-y-16">
            <div className="aspect-[9/19] overflow-hidden rounded-[1.8rem] border-[8px] border-text-primary/90 bg-surface-base shadow-2xl">
              <Image
                src={screenshotPath(locale, step.screenshot)}
                alt={i18n._(step.screenshotAlt)}
                width={560}
                height={1184}
                unoptimized
                className="size-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepsSection = () => (
  <section
    id={SECTION_ID.STEPS}
    className="relative scroll-mt-20 py-20 lg:py-28"
  >
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium text-primary-600">
          <Trans>使い方</Trans>
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
          <Trans>はじめの 4 ステップ</Trans>
        </h2>
      </div>
      <div className="flex flex-col gap-20 lg:gap-28">
        {STEPS.map((step, index) => (
          <StepCard
            key={step.title.id ?? String(index)}
            step={step}
            index={index}
          />
        ))}
      </div>
    </div>
  </section>
);

export default StepsSection;

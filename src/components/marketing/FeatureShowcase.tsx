"use client";

import { useAtomValue } from "jotai";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import {
  QrCode,
  LayoutGrid,
  Shirt,
  BellRing,
  CalendarRange,
  MonitorSmartphone,
  WifiOff,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MessageDescriptor } from "@lingui/core";
import { localeAtom } from "@/i18n/localeAtom";
import {
  screenshotPath,
  type ScreenshotName,
} from "@/components/marketing/screenshotPath";
import PhoneFrame from "@/components/marketing/PhoneFrame";
import { SECTION_ID } from "@/components/marketing/sectionIds";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

const SHOWCASES: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly bullets: readonly MessageDescriptor[];
  readonly screenshot: ScreenshotName;
  readonly screenshotAlt: MessageDescriptor;
}> = [
  {
    icon: QrCode,
    title: msg`QR を順番にスキャンするだけで、収納を記録`,
    body: msg`場所の QR → 服の QR と続けて読み取ると、「どこに、何をしまったか」が自動で記録されます。手で入力する項目はありません。`,
    bullets: [
      msg`服を出すとき・戻すときもスキャン 1 回`,
      msg`NFC タグへのタッチでも記録できます（Android）`,
    ],
    screenshot: "scan",
    screenshotAlt: msg`QR スキャン画面のスクリーンショット`,
  },
  {
    icon: LayoutGrid,
    title: msg`どの引き出しに何着あるか、図で見える`,
    body: msg`衣装ケースをマス目のグリッドで表示。マスごとの服の数がひと目で分かるので、「あの服はケース A の右上」がすぐ思い出せます。`,
    bullets: [
      msg`ケースの行 × 列は自由に設定できます`,
      msg`しばらく開けていないマスには印が付きます`,
    ],
    screenshot: "locations",
    screenshotAlt: msg`収納グリッド画面のスクリーンショット`,
  },
  {
    icon: Shirt,
    title: msg`増えた服も、検索とフィルタですぐ見つかる`,
    body: msg`登録した服はワードローブに一覧表示。カテゴリ・ドールサイズ・ブランドで絞り込めるので、何百着あっても目的の 1 着にたどり着けます。`,
    bullets: [
      msg`SD / MSD などサイズ別に絞り込み`,
      msg`取り出し中の服にはバッジが付きます`,
    ],
    screenshot: "garments",
    screenshotAlt: msg`ワードローブ画面のスクリーンショット`,
  },
  {
    icon: BellRing,
    title: msg`出しっぱなし・しまいっぱなしを、そっと教えてくれる`,
    body: msg`取り出したまま戻していない服や、しばらく開けていない場所をダッシュボードに表示。「しまった／使用中／紛失」の 3 択で答えるだけで片付きます。`,
    bullets: [
      msg`しばらく開けていない場所をリストアップ`,
      msg`3 択で答えるだけで記録が最新になります`,
    ],
    screenshot: "dashboard",
    screenshotAlt: msg`ダッシュボード画面のスクリーンショット`,
  },
];

const SUB_FEATURES: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
}> = [
  {
    icon: CalendarRange,
    title: msg`通知は週 1 回だけ`,
    body: msg`月曜の朝にダイジェストが届くだけ。個別のプッシュ通知で急かさない、穏やかな設計です。`,
  },
  {
    icon: MonitorSmartphone,
    title: msg`インストール不要の PWA`,
    body: msg`ブラウザで開いて、ホーム画面に追加するだけ。アプリストアからのダウンロードは不要です。`,
  },
  {
    icon: WifiOff,
    title: msg`オフラインでも見られる`,
    body: msg`データは端末にも保存。電波の届かない部屋でも一覧を確認でき、オンラインに戻ると自動で同期します。`,
  },
];

const STAGGER_DELAY_MS = 80;
const SCREENSHOT_WIDTH = 560;
const SCREENSHOT_HEIGHT = 1184;

const ShowcaseUnit = ({
  showcase,
  index,
}: {
  readonly showcase: (typeof SHOWCASES)[number];
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const locale = useAtomValue(localeAtom);
  const fade = useFadeInOnView();
  const isReversed = index % 2 === 1;
  const Icon = showcase.icon;

  return (
    <div
      ref={fade.ref}
      className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${fade.className}`}
      style={fade.style}
    >
      <div className={isReversed ? "lg:order-2" : undefined}>
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon className="size-6" />
        </div>
        <h3 className="mb-3 font-display text-2xl font-bold leading-tight text-text-primary md:text-3xl">
          {i18n._(showcase.title)}
        </h3>
        <p className="text-base leading-relaxed text-text-secondary">
          {i18n._(showcase.body)}
        </p>
        <ul className="mt-5 flex flex-col gap-2.5">
          {showcase.bullets.map((bullet) => (
            <li
              key={i18n._(bullet)}
              className="flex items-start gap-2.5 text-sm leading-relaxed text-text-secondary"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary-500" />
              {i18n._(bullet)}
            </li>
          ))}
        </ul>
      </div>
      <div className={isReversed ? "lg:order-1" : undefined}>
        <div className="relative mx-auto w-fit">
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[3rem] opacity-50 blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.14 350 / 0.3), oklch(0.65 0.14 290 / 0.25))",
            }}
          />
          <PhoneFrame
            src={screenshotPath(locale, showcase.screenshot)}
            alt={i18n._(showcase.screenshotAlt)}
            width={SCREENSHOT_WIDTH}
            height={SCREENSHOT_HEIGHT}
            className="relative w-[240px] sm:w-[280px]"
          />
        </div>
      </div>
    </div>
  );
};

const SubFeatureCard = ({
  feature,
  index,
}: {
  readonly feature: (typeof SUB_FEATURES)[number];
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const fade = useFadeInOnView();
  const Icon = feature.icon;

  return (
    <div
      ref={fade.ref}
      className={`flex flex-col gap-4 rounded-2xl bg-surface-overlay p-6 ring-1 ring-inset ring-border-default/60 ${fade.className}`}
      style={{
        ...fade.style,
        transitionDelay: `${index * STAGGER_DELAY_MS}ms`,
      }}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-50 text-accent-500">
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="mb-2 font-display text-lg font-bold text-text-primary">
          {i18n._(feature.title)}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {i18n._(feature.body)}
        </p>
      </div>
    </div>
  );
};

const FeatureShowcase = () => (
  <section
    id={SECTION_ID.FEATURES}
    className="relative scroll-mt-20 bg-surface-base/40 py-20 lg:py-28"
  >
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="mx-auto mb-16 max-w-2xl text-center lg:mb-24">
        <p className="mb-3 text-sm font-medium text-primary-600">
          <Trans>できること</Trans>
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
          <Trans>
            QR と NFC で、
            <br className="sm:hidden" />
            収納を半自動化する
          </Trans>
        </h2>
      </div>
      <div className="flex flex-col gap-20 lg:gap-28">
        {SHOWCASES.map((showcase, index) => (
          <ShowcaseUnit
            key={showcase.screenshot}
            showcase={showcase}
            index={index}
          />
        ))}
      </div>
      <div className="mt-20 grid grid-cols-1 gap-5 md:grid-cols-3 lg:mt-28">
        {SUB_FEATURES.map((feature, index) => (
          <SubFeatureCard
            key={feature.title.id}
            feature={feature}
            index={index}
          />
        ))}
      </div>
    </div>
  </section>
);

export default FeatureShowcase;

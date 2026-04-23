"use client";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import {
  QrCode,
  Nfc,
  LayoutGrid,
  Clock,
  PackageSearch,
  CalendarRange,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MessageDescriptor } from "@lingui/core";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

const FEATURES: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly accent: "primary" | "accent";
}> = [
  {
    icon: QrCode,
    title: msg`QR スキャンで収納記録`,
    body: msg`場所の QR → 服の QR を連続スキャンするだけ。どこに何をしまったかが、自動で残ります。`,
    accent: "primary",
  },
  {
    icon: Nfc,
    title: msg`NFC にも対応`,
    body: msg`タグに触れるだけで場所を記録。QR が読みづらい現場でもスムーズ（Android）。`,
    accent: "accent",
  },
  {
    icon: LayoutGrid,
    title: msg`収納グリッドで一目で把握`,
    body: msg`引き出しのマス目ごとに「今、何が入っているか」を図で確認できます。`,
    accent: "primary",
  },
  {
    icon: Clock,
    title: msg`最近確認していない服を教えてくれる`,
    body: msg`場所の QR をスキャンしたときに、しばらく見ていない服だけをその場でピックアップ。`,
    accent: "accent",
  },
  {
    icon: PackageSearch,
    title: msg`取り出したまま忘れている服を検知`,
    body: msg`取り出して何日も戻していない服を通知。「戻した／着せた／見つからない」の 3 択で片付きます。`,
    accent: "primary",
  },
  {
    icon: CalendarRange,
    title: msg`週 1 回のダイジェスト`,
    body: msg`通知は月曜の朝 1 回だけ。通知疲れしない、穏やかな設計。`,
    accent: "accent",
  },
];

const ACCENT_STYLES = {
  primary: "bg-primary-50 text-primary-600",
  accent: "bg-accent-50 text-accent-500",
} as const;

const FeatureCard = ({
  icon: Icon,
  title,
  body,
  accent,
  index,
}: {
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly accent: "primary" | "accent";
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const fade = useFadeInOnView();
  return (
    <div
      ref={fade.ref}
      className={`group flex flex-col gap-4 rounded-2xl bg-surface-overlay p-6 ring-1 ring-inset ring-border-default/60 transition-all hover:-translate-y-0.5 hover:shadow-lg ${fade.className}`}
      style={{
        ...fade.style,
        transitionDelay: `${(index % 3) * 80}ms`,
      }}
    >
      <div
        className={`flex size-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${ACCENT_STYLES[accent]}`}
      >
        <Icon className="size-6" />
      </div>
      <div>
        <h3 className="mb-2 font-display text-lg font-bold text-text-primary">
          {i18n._(title)}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {i18n._(body)}
        </p>
      </div>
    </div>
  );
};

const FeatureGrid = () => (
  <section className="relative bg-surface-base/40 py-20 lg:py-28">
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="mx-auto mb-16 max-w-2xl text-center">
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <FeatureCard
            key={feature.title.id ?? String(index)}
            icon={feature.icon}
            title={feature.title}
            body={feature.body}
            accent={feature.accent}
            index={index}
          />
        ))}
      </div>
    </div>
  </section>
);

export default FeatureGrid;

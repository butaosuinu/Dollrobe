"use client";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { ChevronDown } from "lucide-react";
import type { MessageDescriptor } from "@lingui/core";
import { SECTION_ID } from "@/components/marketing/sectionIds";

const FAQS: ReadonlyArray<{
  readonly question: MessageDescriptor;
  readonly answer: MessageDescriptor;
}> = [
  {
    question: msg`iPhone でも使えますか？`,
    answer: msg`使えます。QR スキャンはブラウザのカメラだけで動くので、iPhone / Android どちらでも OK。NFC タッチは Android Chrome のみの対応なので、収納場所には QR と NFC の両方を貼っておく運用がおすすめです。`,
  },
  {
    question: msg`QR ラベルはどうやって用意しますか？`,
    answer: msg`アプリの印刷ページから、登録した場所や服の QR ラベルをまとめて生成できます。シール用紙に印刷して、引き出しや服のタグに貼るだけです。`,
  },
  {
    question: msg`無料で使えますか？`,
    answer: msg`無料で使えます。Google または X アカウントでログインするだけで、すべての機能をそのまま利用できます。`,
  },
  {
    question: msg`アプリのインストールは必要ですか？`,
    answer: msg`不要です。Dollrobe は PWA なので、ブラウザで開いてそのまま使えます。ホーム画面に追加すれば、アプリのように起動できます。`,
  },
  {
    question: msg`オフラインでも使えますか？`,
    answer: msg`使えます。データは端末にも保存されるので、電波の届かない部屋でも一覧や収納グリッドを確認できます。オンラインに戻ったときに自動で同期します。`,
  },
  {
    question: msg`通知がたくさん来たりしませんか？`,
    answer: msg`しません。通知は週 1 回、月曜の朝のダイジェストだけ。個別のプッシュ通知で急かさない設計です。`,
  },
];

const FAQSection = () => {
  const { i18n } = useLingui();

  return (
    <section
      id={SECTION_ID.FAQ}
      className="relative scroll-mt-20 bg-surface-base/40 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-sm font-medium text-primary-600">
            <Trans>よくある質問</Trans>
          </p>
          <h2 className="font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
            <Trans>はじめる前の、気になるところ</Trans>
          </h2>
        </div>
        <div className="divide-y divide-border-default/60 overflow-hidden rounded-2xl bg-surface-overlay ring-1 ring-inset ring-border-default/60">
          {FAQS.map((faq) => (
            <details key={i18n._(faq.question)} name="lp-faq" className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-display font-bold text-text-primary transition-colors hover:bg-primary-50/40 [&::-webkit-details-marker]:hidden">
                {i18n._(faq.question)}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-primary-500 transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-text-secondary group-open:[animation:slide-up_250ms_var(--ease-smooth)]">
                {i18n._(faq.answer)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;

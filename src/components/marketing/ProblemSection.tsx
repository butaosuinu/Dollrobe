"use client";

import Image from "next/image";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

const PROBLEMS: ReadonlyArray<{
  readonly photo: string;
  readonly photoAlt: MessageDescriptor;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
}> = [
  {
    photo: "/lp/photos/problem-where-is-it.webp",
    photoAlt: msg`引き出しの中に並ぶミニチュアのドール服の俯瞰写真`,
    title: msg`どこにしまったか分からない`,
    body: msg`服が増えるほど、どの引き出しに何を入れたか思い出せなくなる。探すだけで時間が溶けていく。`,
  },
  {
    photo: "/lp/photos/problem-shifted.webp",
    photoAlt: msg`並んだ 2 つのコンパートメント引き出しに収まるドール服の俯瞰写真`,
    title: msg`収納を入れ替えたらズレる`,
    body: msg`片付けの度に場所が変わり、アプリの記録と現実の居場所がすぐに合わなくなる。`,
  },
  {
    photo: "/lp/photos/problem-missing.webp",
    photoAlt: msg`ミニチュアの木製ラックに並ぶドール服と、中央の空のハンガー`,
    title: msg`気づいたら行方不明`,
    body: msg`しばらく着せていない服が、いつの間にか箱の底で見つからない服になっている。`,
  },
];

const ProblemCard = ({
  problem,
  index,
}: {
  readonly problem: (typeof PROBLEMS)[number];
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const fade = useFadeInOnView();
  return (
    <div
      ref={fade.ref}
      className={`overflow-hidden rounded-2xl bg-surface-raised/80 ring-1 ring-inset ring-border-default/60 backdrop-blur-sm ${fade.className}`}
      style={{
        ...fade.style,
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="aspect-square overflow-hidden">
        <Image
          src={problem.photo}
          alt={i18n._(problem.photoAlt)}
          width={1280}
          height={1280}
          unoptimized
          className="size-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <h3 className="font-display text-lg font-bold text-text-primary">
          {i18n._(problem.title)}
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          {i18n._(problem.body)}
        </p>
      </div>
    </div>
  );
};

const ProblemSection = () => (
  <section className="relative py-20 lg:py-28">
    <div className="mx-auto max-w-6xl px-4 lg:px-8">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-3 text-sm font-medium text-primary-600">
          <Trans>ドール服コレクターの「あるある」</Trans>
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-text-primary md:text-4xl">
          <Trans>
            服が増えるほど、
            <br className="sm:hidden" />
            管理が難しくなる
          </Trans>
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PROBLEMS.map((problem, index) => (
          <ProblemCard
            key={problem.title.id ?? String(index)}
            problem={problem}
            index={index}
          />
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;

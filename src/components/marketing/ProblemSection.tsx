"use client";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { PackageSearch, Shuffle, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MessageDescriptor } from "@lingui/core";
import { useFadeInOnView } from "@/hooks/useFadeInOnView";

const PROBLEMS: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
}> = [
  {
    icon: PackageSearch,
    title: msg`どこにしまったか分からない`,
    body: msg`服が増えるほど、どの引き出しに何を入れたか思い出せなくなる。探すだけで時間が溶けていく。`,
  },
  {
    icon: Shuffle,
    title: msg`収納を入れ替えたらズレる`,
    body: msg`片付けの度に場所が変わり、アプリの記録と現実の居場所がすぐに合わなくなる。`,
  },
  {
    icon: HelpCircle,
    title: msg`気づいたら行方不明`,
    body: msg`しばらく着せていない服が、いつの間にか箱の底で見つからない服になっている。`,
  },
];

const ProblemCard = ({
  icon: Icon,
  title,
  body,
  index,
}: {
  readonly icon: LucideIcon;
  readonly title: MessageDescriptor;
  readonly body: MessageDescriptor;
  readonly index: number;
}) => {
  const { i18n } = useLingui();
  const fade = useFadeInOnView();
  return (
    <div
      ref={fade.ref}
      className={`flex flex-col gap-3 rounded-2xl bg-surface-raised/80 p-6 ring-1 ring-inset ring-border-default/60 backdrop-blur-sm ${fade.className}`}
      style={{
        ...fade.style,
        transitionDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
        <Icon className="size-6" />
      </div>
      <h3 className="font-display text-lg font-bold text-text-primary">
        {i18n._(title)}
      </h3>
      <p className="text-sm leading-relaxed text-text-secondary">
        {i18n._(body)}
      </p>
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
            icon={problem.icon}
            title={problem.title}
            body={problem.body}
            index={index}
          />
        ))}
      </div>
    </div>
  </section>
);

export default ProblemSection;

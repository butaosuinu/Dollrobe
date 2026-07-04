"use client";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import type { MessageDescriptor } from "@lingui/core";
import { SECTION_ID, type SectionId } from "@/components/marketing/sectionIds";

const NAV_ITEMS: ReadonlyArray<{
  readonly id: SectionId;
  readonly label: MessageDescriptor;
}> = [
  { id: SECTION_ID.FEATURES, label: msg`できること` },
  { id: SECTION_ID.STEPS, label: msg`使い方` },
  { id: SECTION_ID.FAQ, label: msg`よくある質問` },
];

type Props = {
  readonly linkClassName: string;
};

const MarketingNavLinks = ({ linkClassName }: Props) => {
  const { i18n } = useLingui();

  return (
    <>
      {NAV_ITEMS.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={linkClassName}>
          {i18n._(item.label)}
        </a>
      ))}
    </>
  );
};

export default MarketingNavLinks;

"use client";

import { t } from "@lingui/core/macro";
import SettingsTabs from "@/components/settings/SettingsTabs";
import PageHeader from "@/components/ui/PageHeader";

const SettingsLayout = ({
  children,
}: {
  readonly children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-6 p-4">
    <PageHeader title={t`設定`} backHref="/" backLabel={t`戻る`} />
    <SettingsTabs />
    {children}
  </div>
);

export default SettingsLayout;

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import clsx from "clsx";

const SettingsTabs = () => {
  const pathname = usePathname();
  const isAccount = pathname?.startsWith("/settings/account") ?? false;
  const isApiKeys = pathname?.startsWith("/settings/api-keys") ?? false;

  return (
    <nav
      className="inline-flex rounded-xl bg-primary-50 p-1 text-sm font-medium"
      aria-label={t`設定`}
    >
      <Link
        href="/settings/account"
        aria-current={isAccount ? "page" : undefined}
        className={clsx(
          "rounded-lg px-4 py-1.5 transition-colors",
          isAccount
            ? "bg-surface-overlay text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Trans>アカウント</Trans>
      </Link>
      <Link
        href="/settings/api-keys"
        aria-current={isApiKeys ? "page" : undefined}
        className={clsx(
          "rounded-lg px-4 py-1.5 transition-colors",
          isApiKeys
            ? "bg-surface-overlay text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Trans>API キー</Trans>
      </Link>
    </nav>
  );
};

export default SettingsTabs;

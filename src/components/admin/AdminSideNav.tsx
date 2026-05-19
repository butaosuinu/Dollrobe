"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Users, ScrollText } from "lucide-react";
import clsx from "clsx";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";

const ADMIN_NAV_LINKS = [
  { href: "/admin", icon: BarChart3, label: msg`メトリクス` },
  { href: "/admin/users", icon: Users, label: msg`ユーザー` },
  { href: "/admin/audits", icon: ScrollText, label: msg`監査ログ` },
];

const isActiveAdminPath = (current: string, target: string): boolean =>
  target === "/admin"
    ? current === "/admin"
    : current === target || current.startsWith(`${target}/`);

const AdminSideNav = () => {
  const pathname = usePathname();
  const { i18n } = useLingui();

  return (
    <nav
      aria-label={i18n._(msg`管理画面ナビゲーション`)}
      className="flex flex-col gap-1 lg:w-56"
    >
      <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        <Trans>管理</Trans>
      </p>
      <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-x-visible">
        {ADMIN_NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const isActive = isActiveAdminPath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-100 text-primary-700"
                    : "text-text-secondary hover:bg-primary-50 hover:text-text-primary",
                )}
              >
                <Icon className="size-4" />
                {i18n._(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminSideNav;

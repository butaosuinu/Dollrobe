import {
  Home,
  Shirt,
  ScanLine,
  LayoutGrid,
  Users,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { msg } from "@lingui/core/macro";
import type { MessageDescriptor } from "@lingui/core";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/lib/auth";
import { USER_ROLE } from "@/lib/auth";

// href / label / icon を保持する nav エントリ。
// `icon` が関数型 (LucideIcon は ForwardRefExoticComponent) のため、
// `functional/no-mixed-types` が落ちるが、ここでは構造の単純さを優先して許容する。
// eslint-disable-next-line functional/no-mixed-types -- icon は関数型コンポーネント
export type NavItem = {
  readonly href: string;
  readonly label: MessageDescriptor;
  readonly icon: LucideIcon;
};

const navItem = (
  href: string,
  label: MessageDescriptor,
  icon: LucideIcon,
): NavItem => ({ href, label, icon });

const BASE_NAV_ITEMS: readonly NavItem[] = [
  navItem("/dashboard", msg`ホーム`, Home),
  navItem("/garments", msg`ワードローブ`, Shirt),
  navItem("/coordinates", msg`コーデ`, Sparkles),
  navItem("/scan", msg`スキャン`, ScanLine),
  navItem("/dolls", msg`ドール`, Users),
  navItem("/locations", msg`収納`, LayoutGrid),
];

const ADMIN_NAV_ITEM: NavItem = navItem("/admin", msg`管理`, ShieldCheck);

export const getNavItems = (role: UserRole | undefined): readonly NavItem[] =>
  role === USER_ROLE.ADMIN
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : BASE_NAV_ITEMS;

// 既存呼び出しの互換用 (role 未考慮の最小集合)。
// admin 入口が必要なナビゲーション (TopBar / BottomNav) は getNavItems(role) を使うこと。
export const NAV_ITEMS = BASE_NAV_ITEMS;

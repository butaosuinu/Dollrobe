import {
  Home,
  Shirt,
  ScanLine,
  LayoutGrid,
  Users,
  Sparkles,
} from "lucide-react";
import { msg } from "@lingui/core/macro";

export const NAV_ITEMS = [
  { href: "/", label: msg`ホーム`, icon: Home },
  { href: "/garments", label: msg`ワードローブ`, icon: Shirt },
  { href: "/coordinates", label: msg`コーデ`, icon: Sparkles },
  { href: "/scan", label: msg`スキャン`, icon: ScanLine },
  { href: "/dolls", label: msg`ドール`, icon: Users },
  { href: "/locations", label: msg`収納`, icon: LayoutGrid },
];

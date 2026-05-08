"use client";

import Link from "next/link";
import clsx from "clsx";

type Props = {
  readonly href?: string;
  readonly variant?: "primary" | "secondary";
  readonly size?: "md" | "lg";
  readonly children: React.ReactNode;
  readonly className?: string;
};

const DEFAULT_HREF = `/signin?redirect=${encodeURIComponent("/dashboard")}`;

/* eslint-disable lingui/no-unlocalized-strings -- Tailwind class strings, not user copy */
const VARIANT_STYLES = {
  primary:
    "bg-primary-500 text-text-inverse hover:bg-primary-600 shadow-[0_8px_24px_-8px_oklch(0.62_0.17_350_/_0.5)] hover:shadow-[0_12px_32px_-8px_oklch(0.62_0.17_350_/_0.55)]",
  secondary:
    "bg-surface-overlay text-primary-700 border border-border-default hover:bg-primary-50",
} as const;
/* eslint-enable lingui/no-unlocalized-strings */

const SIZE_STYLES = {
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

const MarketingCTA = ({
  href = DEFAULT_HREF,
  variant = "primary",
  size = "lg",
  children,
  className,
}: Props) => (
  <Link
    href={href}
    className={clsx(
      "inline-flex items-center justify-center gap-2 rounded-full font-display font-bold transition-all",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      className,
    )}
  >
    {children}
  </Link>
);

export default MarketingCTA;

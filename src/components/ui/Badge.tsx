import clsx from "clsx";

type BadgeVariant =
  | "default"
  | "primary"
  | "confirmed"
  | "uncertain"
  | "unknown";

type Props = {
  readonly variant?: BadgeVariant;
  readonly children: React.ReactNode;
};

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-text-secondary",
  primary: "bg-primary-100 text-primary-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  uncertain: "bg-amber-50 text-amber-700",
  unknown: "bg-orange-50 text-orange-700",
};

const Badge = ({ variant = "default", children }: Props) => (
  <span
    className={clsx(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      VARIANT_STYLES[variant],
    )}
  >
    {children}
  </span>
);

export default Badge;

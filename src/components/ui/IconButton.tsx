import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type Props = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly size?: "sm" | "md";
  readonly variant?: "default" | "primary" | "danger";
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const SIZE_STYLES = {
  sm: "size-8",
  md: "size-10",
} as const;

const VARIANT_STYLES = {
  default: "text-text-secondary hover:bg-primary-50 active:bg-primary-100",
  primary: "text-primary-500 hover:bg-primary-50 active:bg-primary-100",
  danger: "text-danger hover:bg-red-50 active:bg-red-100",
} as const;

const ICON_SIZES = {
  sm: "size-4",
  md: "size-5",
} as const;

const IconButton = ({
  icon: Icon,
  label,
  size = "md",
  variant = "default",
  disabled,
  ...rest
}: Props) => (
  <button
    aria-label={label}
    className={clsx(
      "inline-flex items-center justify-center rounded-lg transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      SIZE_STYLES[size],
      VARIANT_STYLES[variant],
      disabled && "pointer-events-none opacity-50",
    )}
    disabled={disabled}
    {...rest}
  >
    <Icon className={ICON_SIZES[size]} />
  </button>
);

export default IconButton;

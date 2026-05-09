import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type IconButtonSize = "xs" | "sm" | "md" | "lg";
type IconButtonVariant = "default" | "primary" | "danger";

type Props = {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly size?: IconButtonSize;
  readonly variant?: IconButtonVariant;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const SIZE_STYLES = {
  xs: "size-7",
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
} as const satisfies Record<IconButtonSize, string>;

const VARIANT_STYLES = {
  default: "text-text-secondary hover:bg-primary-50 active:bg-primary-100",
  primary: "text-primary-500 hover:bg-primary-50 active:bg-primary-100",
  danger: "text-danger hover:bg-danger/15 active:bg-danger/25",
} as const satisfies Record<IconButtonVariant, string>;

const ICON_SIZES = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-4",
  lg: "size-5",
} as const satisfies Record<IconButtonSize, string>;

type IconButtonClassNameOptions = {
  readonly size?: IconButtonSize;
  readonly variant?: IconButtonVariant;
  readonly disabled?: boolean;
};

export const iconButtonClassName = ({
  size = "md",
  variant = "default",
  disabled = false,
}: IconButtonClassNameOptions = {}) =>
  clsx(
    "inline-flex items-center justify-center rounded-lg transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
    SIZE_STYLES[size],
    VARIANT_STYLES[variant],
    disabled && "pointer-events-none opacity-50",
  );

const IconButton = ({
  icon: Icon,
  label,
  size = "md",
  variant = "default",
  type = "button",
  disabled,
  ...rest
}: Props) => (
  <button
    type={type}
    aria-label={label}
    className={iconButtonClassName({
      size,
      variant,
      disabled: disabled === true,
    })}
    disabled={disabled}
    {...rest}
  >
    <Icon className={ICON_SIZES[size]} />
  </button>
);

export default IconButton;

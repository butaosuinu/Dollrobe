import clsx from "clsx";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline"
  | "danger-solid";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-text-inverse hover:bg-primary-600 active:bg-primary-700",
  secondary:
    "bg-primary-100 text-primary-700 hover:bg-primary-200 active:bg-primary-300",
  ghost:
    "bg-transparent text-text-secondary hover:bg-primary-50 active:bg-primary-100",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 active:bg-danger/25",
  outline:
    "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50 hover:text-primary-700",
  "danger-solid":
    "bg-danger text-text-inverse hover:opacity-90 active:opacity-80",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

type ButtonClassNameOptions = {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  readonly disabled?: boolean;
};

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
}: ButtonClassNameOptions = {}) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
    FOCUS_RING_CLASS,
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    fullWidth && "w-full",
    disabled && "opacity-50",
  );

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  children,
  disabled,
  ...rest
}: Props) => (
  <button
    type={type}
    className={buttonClassName({
      variant,
      size,
      fullWidth,
      disabled: Boolean(disabled),
    })}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);

export default Button;

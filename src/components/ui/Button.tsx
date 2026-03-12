import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
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
  danger: "bg-red-50 text-danger hover:bg-red-100 active:bg-red-200",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const Button = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  children,
  disabled,
  ...rest
}: Props) => (
  <button
    className={clsx(
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      fullWidth && "w-full",
      disabled && "pointer-events-none opacity-50",
    )}
    disabled={disabled}
    {...rest}
  >
    {children}
  </button>
);

export default Button;

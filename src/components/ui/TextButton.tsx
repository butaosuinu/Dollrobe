import clsx from "clsx";

type TextButtonVariant = "primary" | "secondary" | "muted";

type Props = {
  readonly variant?: TextButtonVariant;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
};

const VARIANT_STYLES: Record<TextButtonVariant, string> = {
  primary: "text-primary-500 hover:text-primary-600",
  secondary: "text-text-secondary hover:text-text-primary",
  muted: "text-text-tertiary hover:text-text-secondary",
};

const TextButton = ({
  variant = "primary",
  onClick,
  children,
  disabled = false,
}: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "text-sm font-medium transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      VARIANT_STYLES[variant],
      disabled && "pointer-events-none opacity-50",
    )}
  >
    {children}
  </button>
);

export default TextButton;

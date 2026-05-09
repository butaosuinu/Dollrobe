import clsx from "clsx";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

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
      "inline-flex items-center gap-1 text-sm font-medium transition-colors",
      FOCUS_RING_CLASS,
      VARIANT_STYLES[variant],
      disabled && "pointer-events-none opacity-50",
    )}
  >
    {children}
  </button>
);

export default TextButton;

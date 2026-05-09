import clsx from "clsx";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

type Props = {
  readonly selected: boolean;
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
  readonly className?: string;
};

const Chip = ({
  selected,
  onClick,
  children,
  disabled = false,
  className,
}: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={clsx(
      "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
      FOCUS_RING_CLASS,
      selected
        ? "bg-primary-500 text-text-inverse"
        : "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
      disabled && "pointer-events-none opacity-50",
      className,
    )}
  >
    {children}
  </button>
);

export default Chip;

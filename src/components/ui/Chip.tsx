import clsx from "clsx";

type Props = {
  readonly selected: boolean;
  readonly onClick?: () => void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
};

const Chip = ({ selected, onClick, children, disabled = false }: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={selected}
    className={clsx(
      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
      selected
        ? "bg-primary-500 text-text-inverse"
        : "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
      disabled && "pointer-events-none opacity-50",
    )}
  >
    {children}
  </button>
);

export default Chip;

import clsx from "clsx";

type Props = {
  readonly label?: string;
  readonly error?: string;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

const Textarea = ({ label, error, id, ...rest }: Props) => {
  const textareaId = id ?? label?.replace(/\s+/gu, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1.5">
      {label !== undefined && (
        <label
          htmlFor={textareaId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={clsx(
          "rounded-lg border bg-surface-overlay px-3 py-2 text-sm text-text-primary transition-colors",
          "placeholder:text-text-tertiary",
          "focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100",
          error === undefined
            ? "border-border-default hover:border-border-strong"
            : "border-danger",
        )}
        {...rest}
      />
      {error !== undefined && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
};

export default Textarea;

import clsx from "clsx";

type Props = {
  readonly children: React.ReactNode;
  readonly hoverable?: boolean;
  readonly className?: string;
};

const Card = ({ children, hoverable = false, className }: Props) => (
  <div
    className={clsx(
      "rounded-xl border border-border-default bg-surface-overlay p-4 shadow-card",
      hoverable &&
        "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
      className,
    )}
  >
    {children}
  </div>
);

export default Card;

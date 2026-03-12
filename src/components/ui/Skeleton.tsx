import clsx from "clsx";

type Props = {
  readonly className?: string;
};

const Skeleton = ({ className }: Props) => (
  <div
    className={clsx(
      "animate-[skeleton-shimmer_1.5s_ease-in-out_infinite] rounded-lg bg-gradient-to-r from-border-default via-surface-raised to-border-default bg-[length:200%_100%]",
      className,
    )}
    aria-hidden="true"
  />
);

export default Skeleton;

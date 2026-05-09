import clsx from "clsx";

type Props = {
  readonly page: number;
  readonly currentPage: number;
  readonly onClick: (page: number) => void;
};

const PageButton = ({ page, currentPage, onClick }: Props) => {
  const active = page === currentPage;
  return (
    <button
      type="button"
      onClick={() => onClick(page)}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "size-8 rounded-lg text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
        active
          ? "bg-primary-500 text-text-inverse"
          : "border border-border-default bg-surface-overlay text-text-secondary hover:bg-primary-50",
      )}
    >
      {page}
    </button>
  );
};

export default PageButton;

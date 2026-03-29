import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";

type Props = {
  readonly title: React.ReactNode;
  readonly backHref?: string;
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly size?: "md" | "lg";
  readonly animated?: boolean;
};

const TITLE_SIZE = Object.freeze({
  md: "text-lg",
  lg: "text-xl",
});

const PageHeader = ({
  title,
  backHref,
  onBack,
  backLabel,
  size = "lg",
  animated = backHref !== undefined,
}: Props) => {
  const backButton =
    backHref !== undefined ? (
      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50"
      >
        <ArrowLeft className="size-5" />
      </Link>
    ) : onBack !== undefined ? (
      <button
        onClick={onBack}
        aria-label={backLabel}
        className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-50"
      >
        <ArrowLeft className="size-5" />
      </button>
    ) : undefined;

  return (
    <div
      className={clsx(
        "flex items-center gap-3",
        animated && "animate-[fade-in_0.4s_ease-out]",
      )}
    >
      {backButton}
      <h2 className={clsx("font-display font-bold", TITLE_SIZE[size])}>
        {title}
      </h2>
    </div>
  );
};

export default PageHeader;

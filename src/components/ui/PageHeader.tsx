import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clsx from "clsx";
import IconButton, { iconButtonClassName } from "@/components/ui/IconButton";

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
        className={iconButtonClassName({ size: "md" })}
      >
        <ArrowLeft className="size-4" />
      </Link>
    ) : onBack !== undefined ? (
      <IconButton
        icon={ArrowLeft}
        label={backLabel ?? ""}
        size="md"
        onClick={onBack}
      />
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

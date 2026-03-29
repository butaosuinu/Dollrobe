import Link from "next/link";
import { Plus, type LucideIcon } from "lucide-react";

type Props = {
  readonly icon?: LucideIcon;
  readonly href?: string;
  readonly onClick?: () => void;
  readonly label?: string;
};

const SHARED_CLASS =
  "fixed bottom-20 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-primary-500 text-text-inverse shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl active:scale-95 lg:hidden";

const SAFE_AREA_STYLE = {
  marginBottom: "env(safe-area-inset-bottom, 0px)",
};

const FAB = ({ icon: Icon = Plus, href, onClick, label }: Props) => {
  const iconElement = <Icon className="size-6" />;

  if (href !== undefined) {
    return (
      <Link
        href={href}
        className={SHARED_CLASS}
        style={SAFE_AREA_STYLE}
        aria-label={label}
      >
        {iconElement}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      className={SHARED_CLASS}
      style={SAFE_AREA_STYLE}
      aria-label={label}
    >
      {iconElement}
    </button>
  );
};

export default FAB;

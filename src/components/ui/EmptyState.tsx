import type { LucideIcon } from "lucide-react";
import Button from "@/components/ui/Button";

type Props = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: Props) => (
  <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
    <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-50">
      <Icon className="size-8 text-primary-300" />
    </div>
    <h3 className="font-display text-lg font-bold text-text-primary">{title}</h3>
    <p className="max-w-xs text-sm text-text-secondary">{description}</p>
    {actionLabel !== undefined && onAction !== undefined && (
      <Button variant="secondary" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;

import clsx from "clsx";

type CardPadding = "sm" | "md" | "lg";
type CardRadius = "md" | "lg";

const PADDING_STYLES: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const RADIUS_STYLES: Record<CardRadius, string> = {
  md: "rounded-xl",
  lg: "rounded-2xl",
};

type BaseProps = {
  readonly children: React.ReactNode;
  readonly hoverable?: boolean;
  readonly padding?: CardPadding;
  readonly radius?: CardRadius;
  readonly className?: string;
};

type StaticProps = BaseProps & {
  readonly clickable?: false;
  readonly onClick?: never;
  readonly disabled?: never;
  readonly type?: never;
};

type ClickableProps = BaseProps & {
  readonly clickable: true;
  readonly onClick?: React.MouseEventHandler<HTMLButtonElement>;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit";
  readonly ariaPressed?: boolean;
  readonly ariaLabel?: string;
};

type Props = StaticProps | ClickableProps;

const cardClassName = ({
  hoverable,
  padding,
  radius,
  clickable,
  className,
}: {
  readonly hoverable: boolean;
  readonly padding: CardPadding;
  readonly radius: CardRadius;
  readonly clickable: boolean;
  readonly className: string | undefined;
}) =>
  clsx(
    "border border-border-default bg-surface-overlay shadow-card",
    PADDING_STYLES[padding],
    RADIUS_STYLES[radius],
    hoverable &&
      "transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
    clickable &&
      "text-left w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
    className,
  );

const Card = (props: Props) => {
  const {
    children,
    hoverable = false,
    padding = "md",
    radius = "md",
    className,
  } = props;

  if (props.clickable === true) {
    return (
      <button
        type={props.type ?? "button"}
        onClick={props.onClick}
        disabled={props.disabled}
        aria-pressed={props.ariaPressed}
        aria-label={props.ariaLabel}
        className={cardClassName({
          hoverable,
          padding,
          radius,
          clickable: true,
          className,
        })}
      >
        {children}
      </button>
    );
  }

  return (
    <div
      className={cardClassName({
        hoverable,
        padding,
        radius,
        clickable: false,
        className,
      })}
    >
      {children}
    </div>
  );
};

export default Card;

import clsx from "clsx";
import { FOCUS_RING_CLASS } from "@/lib/uiClasses";

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
} & Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "className" | "children" | keyof BaseProps
  >;

type ClickableProps = BaseProps & {
  readonly clickable: true;
} & Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children" | "type" | keyof BaseProps
  > & {
    readonly type?: "button" | "submit";
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
    clickable && clsx("text-left w-full", FOCUS_RING_CLASS),
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
    const { clickable: _c, type = "button", ...rest } = props;
    return (
      <button
        type={type}
        className={cardClassName({
          hoverable,
          padding,
          radius,
          clickable: true,
          className,
        })}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const { clickable: _c, ...rest } = props;
  return (
    <div
      className={cardClassName({
        hoverable,
        padding,
        radius,
        clickable: false,
        className,
      })}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;

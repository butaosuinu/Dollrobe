import clsx from "clsx";

type FormGap = "sm" | "md" | "lg";

type Props = {
  readonly gap?: FormGap;
  readonly onSubmit: NonNullable<
    React.FormHTMLAttributes<HTMLFormElement>["onSubmit"]
  >;
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly noValidate?: boolean;
};

const GAP_STYLES: Record<FormGap, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

const FormShell = ({
  gap = "md",
  onSubmit,
  children,
  className,
  noValidate,
}: Props) => (
  <form
    onSubmit={onSubmit}
    noValidate={noValidate}
    className={clsx("flex flex-col", GAP_STYLES[gap], className)}
  >
    {children}
  </form>
);

export default FormShell;

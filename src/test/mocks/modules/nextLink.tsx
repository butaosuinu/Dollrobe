import type { ReactNode } from "react";

export const nextLinkFactory = () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    readonly href: string;
    readonly children: ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
});

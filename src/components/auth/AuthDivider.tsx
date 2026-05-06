type Props = {
  readonly children: React.ReactNode;
};

const AuthDivider = ({ children }: Props) => (
  <div className="relative flex items-center py-1" role="separator">
    <div className="grow border-t border-border-default" />
    <span className="px-3 text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
      {children}
    </span>
    <div className="grow border-t border-border-default" />
  </div>
);

export default AuthDivider;

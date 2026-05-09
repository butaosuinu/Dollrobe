type Props = {
  readonly children: React.ReactNode;
};

const ErrorAlert = ({ children }: Props) => (
  <p
    role="alert"
    className="rounded-lg border border-danger/30 bg-danger/8 px-3 py-2 text-xs text-danger"
  >
    {children}
  </p>
);

export default ErrorAlert;

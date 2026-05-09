type Props = {
  readonly title: React.ReactNode;
  readonly description?: React.ReactNode;
  readonly children: React.ReactNode;
};

const SectionCard = ({ title, description, children }: Props) => (
  <section className="rounded-2xl border border-border-default bg-surface-overlay p-5">
    <header className="mb-4 flex flex-col gap-1">
      <h3 className="font-display text-base font-bold text-text-primary">
        {title}
      </h3>
      {description !== undefined && (
        <p className="text-xs text-text-tertiary">{description}</p>
      )}
    </header>
    {children}
  </section>
);

export default SectionCard;

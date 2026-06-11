export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-2 border-b border-border/60 bg-background/80 px-5 pb-3 pt-4 backdrop-blur-lg">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-brand-gradient">{title}</span>
          </h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="bg-wc26-bar absolute inset-x-0 bottom-0 h-0.5 opacity-70" />
    </header>
  );
}

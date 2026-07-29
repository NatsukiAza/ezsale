import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string | null;
  actions?: React.ReactNode;
  className?: string;
  /** Clases del título — p. ej. text-greeting en el panel. */
  titleClassName?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border bg-background/95 px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <h1 className={cn("truncate", titleClassName ?? "text-h1")}>{title}</h1>
        {description ? (
          <p className="text-body-sm text-muted-foreground truncate">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

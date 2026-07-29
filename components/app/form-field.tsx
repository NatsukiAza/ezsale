import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  id: string;
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string | null;
  className?: string;
};

export function FormField({
  id,
  label,
  children,
  hint,
  error,
  className,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-label">
        {label}
      </Label>
      <div
        {...(describedBy
          ? { "aria-describedby": describedBy }
          : undefined)}
      >
        {children}
      </div>
      {error ? (
        <p id={errorId} className="text-body-sm text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

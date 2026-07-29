import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  /** Solo “Ez” — sidebar colapsado y espacios chicos. */
  compact?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
};

/**
 * Wordmark tipográfico de EZSale.
 * Reversible: sin ícono, sin badge. Si el nombre cambia, se toca un solo archivo.
 */
export function BrandMark({
  compact = false,
  href = "/",
  className,
  onClick,
}: BrandMarkProps) {
  const mark = compact ? (
    <span
      className={cn(
        "font-display text-[1.125rem] font-bold leading-none tracking-[-0.04em] text-primary",
        className,
      )}
      aria-label="EZSale"
    >
      Ez
    </span>
  ) : (
    <span
      className={cn(
        "font-display text-[1.25rem] font-bold leading-none tracking-[-0.045em]",
        className,
      )}
    >
      <span className="text-primary">EZ</span>
      <span className="text-foreground">Sale</span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {mark}
    </Link>
  );
}

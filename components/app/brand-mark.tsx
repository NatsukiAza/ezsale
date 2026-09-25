import Link from "next/link";
import { cn } from "@/lib/utils";
import { TicketMark } from "@/components/app/ticket-mark";

type BrandMarkProps = {
  /** Solo el isotipo — sidebar colapsado y espacios chicos. */
  compact?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
};

/**
 * Marca de Toque: isotipo Ticket + wordmark.
 * El color del trazo hereda `currentColor`; el punto es `primary`.
 */
export function BrandMark({
  compact = false,
  href = "/",
  className,
  onClick,
}: BrandMarkProps) {
  const mark = (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground",
        className,
      )}
      aria-label="Toque"
    >
      <TicketMark className={compact ? "size-6" : "size-7"} />
      {compact ? null : (
        <span className="font-display text-[1.25rem] font-bold leading-none tracking-[-0.04em]">
          Toque
        </span>
      )}
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

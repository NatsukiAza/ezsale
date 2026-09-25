import { cn } from "@/lib/utils";

type TicketMarkProps = {
  className?: string;
};

/** Isotipo Ticket de Toque. El punto es el toque (color primary). */
export function TicketMark({ className }: TicketMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("size-7 shrink-0", className)}
    >
      <path
        d="M 30 18 H 70 A 6 6 0 0 1 76 24 V 74 L 69.5 80 L 63 74 L 56.5 80 L 50 74 L 43.5 80 L 37 74 L 30.5 80 L 24 74 V 24 A 6 6 0 0 1 30 18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <line x1="34" y1="33" x2="54" y2="33" strokeWidth="5" />
        <line x1="34" y1="43" x2="50" y2="43" strokeWidth="5" />
        <line x1="34" y1="53" x2="58" y2="53" strokeWidth="5" />
        <line x1="34" y1="65" x2="66" y2="65" strokeWidth="6.5" />
      </g>
      <circle cx="64" cy="41" r="7" className="fill-primary" />
    </svg>
  );
}

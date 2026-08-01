import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * La imagen en flujo define el tamaño. La UI se posiciona en % del mismo
 * sistema de coordenadas del PNG (sin object-contain / aspect-ratio aparte).
 * Inset un poco más adentro del hueco para no pegar al bisel / notch.
 */
const SCREEN = {
  top: "6.6%",
  left: "12.35%",
  right: "12.35%",
  bottom: "11.4%",
} as const;

type NotebookFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function NotebookFrame({ children, className }: NotebookFrameProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-5xl", className)}>
      <div
        className="absolute z-0 overflow-hidden bg-card"
        style={{
          top: SCREEN.top,
          left: SCREEN.left,
          right: SCREEN.right,
          bottom: SCREEN.bottom,
        }}
      >
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>

      <Image
        src="/landing/laptop-mockup.png"
        alt=""
        width={4826}
        height={2798}
        priority
        sizes="(max-width: 1024px) 100vw, 64rem"
        className="relative z-10 h-auto w-full select-none pointer-events-none"
        aria-hidden
        draggable={false}
      />
    </div>
  );
}

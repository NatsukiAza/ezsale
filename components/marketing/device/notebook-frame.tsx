import Image from "next/image";
import { cn } from "@/lib/utils";

/**
<<<<<<< Updated upstream
 * La imagen en flujo define el tamaño. La UI se posiciona en % del mismo
 * sistema de coordenadas del PNG (sin object-contain / aspect-ratio aparte).
 * Inset un poco más adentro del hueco para no pegar al bisel / notch.
 */
const SCREEN = {
  top: "6.6%",
  left: "12.35%",
  right: "12.35%",
  bottom: "11.4%",
=======
 * Coordenadas EXACTAS del hueco transparente en
 * public/landing/laptop-mockup.png (4826×2798).
 * Expandidas 1px para evitar filos por redondeo subpixel.
 * Sin inset extra: el inset anterior dejaba ver el fondo oscuro del hero.
 */
const SCREEN = {
  top: "4.7891%",
  left: "11.7696%",
  right: "11.7696%",
  bottom: "10.6862%",
>>>>>>> Stashed changes
} as const;

type NotebookFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function NotebookFrame({ children, className }: NotebookFrameProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-5xl", className)}>
<<<<<<< Updated upstream
=======
      {/* Misma grilla de píxeles que el PNG: la img en flujo define el tamaño */}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
      <Image
        src="/landing/laptop-mockup.png"
        alt=""
        width={4826}
        height={2798}
        priority
        sizes="(max-width: 1024px) 100vw, 64rem"
        className="relative z-10 h-auto w-full select-none pointer-events-none"
=======
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/laptop-mockup.png?v=4"
        alt=""
        width={4826}
        height={2798}
        className="relative z-10 block h-auto w-full select-none pointer-events-none"
>>>>>>> Stashed changes
        aria-hidden
        draggable={false}
      />
    </div>
  );
}

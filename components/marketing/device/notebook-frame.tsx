import { cn } from "@/lib/utils";

/**
 * Imagen en flujo = caja de referencia.
 * `unoptimized` + <img>: en prod el optimizer de next/image
 * recomprime el PNG con alpha y desalinea el hueco de la pantalla.
 *
 * Coordenadas medidas sobre public/landing/laptop-mockup.png (4826×2798).
 * Inset leve arriba por el notch; lados/abajo casi al borde del display.
 */
const SCREEN = {
  top: "6.04%",
  left: "12.18%",
  right: "12.18%",
  bottom: "11.12%",
} as const;

type NotebookFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function NotebookFrame({ children, className }: NotebookFrameProps) {
  return (
    <div
      className={cn("relative mx-auto w-full max-w-5xl", className)}
      style={{ aspectRatio: "4826 / 2798" }}
    >
      <div
        className="absolute z-0 overflow-hidden bg-background"
        style={{
          top: SCREEN.top,
          left: SCREEN.left,
          right: SCREEN.right,
          bottom: SCREEN.bottom,
        }}
      >
        <div className="absolute inset-0 overflow-hidden">{children}</div>
      </div>

      {/* img nativo a propósito: ver comentario arriba */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/laptop-mockup.png?v=3"
        alt=""
        width={4826}
        height={2798}
        className="absolute inset-0 z-10 h-full w-full select-none object-cover pointer-events-none"
        aria-hidden
        draggable={false}
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}

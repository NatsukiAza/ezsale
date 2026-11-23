"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAmbientBackground } from "@/lib/preferences/ambient-background";

export function AmbientBackgroundSetting() {
  const id = useId();
  const hintId = `${id}-hint`;
  const { enabled, setEnabled } = useAmbientBackground();

  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="cursor-pointer">
          Fondo en movimiento
        </Label>
        <p id={hintId} className="mt-1 text-body-sm text-muted-foreground">
          El fondo se revuelve suave, como el café claro y el oscuro dentro de
          una taza. Si lo apagás, queda el degradado fijo. Si el equipo pide
          menos movimiento, también queda quieto.
        </p>
      </div>
      <Switch
        id={id}
        className="shrink-0 cursor-pointer"
        checked={enabled}
        onCheckedChange={(checked) => setEnabled(checked === true)}
        aria-describedby={hintId}
      />
    </div>
  );
}

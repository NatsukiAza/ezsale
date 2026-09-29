"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePwaInstall } from "@/components/pwa/pwa-context";

function IosSteps() {
  return (
    <ol className="space-y-3 text-body-sm text-foreground">
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          1
        </span>
        <span>
          En Safari, tocá{" "}
          <span className="inline-flex items-center gap-1 font-medium">
            Compartir
            <Share className="size-3.5" strokeWidth={2} />
          </span>{" "}
          (el cuadrado con la flecha).
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          2
        </span>
        <span>
          Elegí{" "}
          <span className="inline-flex items-center gap-1 font-medium">
            Agregar a inicio
            <SquarePlus className="size-3.5" strokeWidth={2} />
          </span>
          .
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          3
        </span>
        <span>Confirmá. El ícono de Toque queda en tu pantalla.</span>
      </li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="space-y-3 text-body-sm text-foreground">
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          1
        </span>
        <span>En Chrome, tocá el menú (tres puntos) arriba a la derecha.</span>
      </li>
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          2
        </span>
        <span>
          Elegí <span className="font-medium">Instalar aplicación</span> o{" "}
          <span className="font-medium">Agregar a la pantalla de inicio</span>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">
          3
        </span>
        <span>Confirmá. Toque queda junto al resto de las apps.</span>
      </li>
    </ol>
  );
}

export function InstallModal() {
  const {
    modalOpen,
    closeModal,
    canNativeInstall,
    nativeInstall,
    isAppleTouch,
    isAndroid,
    inAppBrowser,
  } = usePwaInstall();

  const detected = isAppleTouch ? "ios" : isAndroid ? "android" : "android";
  const [tab, setTab] = useState<"ios" | "android">(detected);

  useEffect(() => {
    if (modalOpen) setTab(detected);
  }, [modalOpen, detected]);

  async function handleNativeInstall() {
    await nativeInstall();
    closeModal();
  }

  if (!modalOpen) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar Toque</DialogTitle>
          <DialogDescription>
            Queda el ícono en el teléfono y se abre a pantalla completa, sin el
            navegador.
          </DialogDescription>
        </DialogHeader>

        {inAppBrowser ? (
          <p className="rounded-md border border-border bg-muted/60 px-3 py-2 text-body-sm">
            Abrí esta página en Chrome o Safari para instalarla. Desde esta
            ventana a veces no se puede.
          </p>
        ) : null}

        {canNativeInstall ? (
          <Button type="button" size="lg" className="w-full" onClick={() => void handleNativeInstall()}>
            Instalar
          </Button>
        ) : (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "ios" | "android")}
          >
            <TabsList className="w-full">
              <TabsTrigger value="android">Android</TabsTrigger>
              <TabsTrigger value="ios">iPhone</TabsTrigger>
            </TabsList>
            <TabsContent value="android" className="pt-3">
              <AndroidSteps />
            </TabsContent>
            <TabsContent value="ios" className="pt-3">
              <IosSteps />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

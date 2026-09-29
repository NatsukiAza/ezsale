"use client";

import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_BANNER_STORAGE_KEY, INSTALL_CTA_LABEL } from "@/lib/pwa/constants";
import { usePwaInstall } from "@/components/pwa/pwa-context";

export function InstallBanner() {
  const { showCta, openModal } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(INSTALL_BANNER_STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!showCta || dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(INSTALL_BANNER_STORAGE_KEY, "1");
    } catch {
      /* private mode */
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="border-b border-border bg-primary-subtle px-4 py-2.5 text-sm text-primary-subtle-foreground"
    >
      <div className="mx-auto flex max-w-[75rem] flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1">
          Instalá Toque en el teléfono para entrar de un toque, sin el navegador.
        </p>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={openModal}
        >
          <Smartphone />
          {INSTALL_CTA_LABEL}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Cerrar"
          onClick={dismiss}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

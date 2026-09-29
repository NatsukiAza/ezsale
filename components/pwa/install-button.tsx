"use client";

import type { ComponentProps } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTALL_CTA_LABEL } from "@/lib/pwa/constants";
import { usePwaInstall } from "@/components/pwa/pwa-context";

type InstallButtonProps = {
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
};

export function InstallButton({
  className,
  variant = "outline",
  size = "lg",
}: InstallButtonProps) {
  const { showCta, openModal } = usePwaInstall();
  if (!showCta) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={openModal}
    >
      <Smartphone />
      {INSTALL_CTA_LABEL}
    </Button>
  );
}

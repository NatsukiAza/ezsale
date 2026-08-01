"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { TERMINOS_PATH } from "@/lib/legal/terminos";

type Props = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  invalid?: boolean;
};

export function TerminosAcceptCheckbox({
  id = "acepto-terminos",
  checked,
  onCheckedChange,
  invalid = false,
}: Props) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        aria-invalid={invalid || undefined}
        className="mt-0.5"
      />
      <label htmlFor={id} className="text-body-sm leading-snug text-muted-foreground">
        He leído y acepto los{" "}
        <Link
          href={TERMINOS_PATH}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Términos y Condiciones
        </Link>
        .
      </label>
    </div>
  );
}

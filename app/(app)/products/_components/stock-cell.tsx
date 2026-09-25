"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function parseCantidad(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function StockCell({
  productId,
  productName,
  idTienda,
  cantidad,
  canEdit,
  onCommitted,
}: {
  productId: string;
  productName: string;
  idTienda: string;
  cantidad: number | undefined;
  canEdit: boolean;
  onCommitted: (productId: string, next: number) => void;
}) {
  const loaded = cantidad !== undefined;
  const display = loaded ? String(cantidad) : "—";
  const negative = loaded && cantidad < 0;

  if (!canEdit) {
    return (
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          negative ? "text-destructive" : "text-muted-foreground",
        )}
        title={loaded ? undefined : "Sin stock cargado"}
      >
        {display}
      </span>
    );
  }

  return (
    <StockCellInput
      key={`${productId}:${loaded ? cantidad : "x"}`}
      productId={productId}
      productName={productName}
      idTienda={idTienda}
      cantidad={cantidad}
      onCommitted={onCommitted}
    />
  );
}

function StockCellInput({
  productId,
  productName,
  idTienda,
  cantidad,
  onCommitted,
}: {
  productId: string;
  productName: string;
  idTienda: string;
  cantidad: number | undefined;
  onCommitted: (productId: string, next: number) => void;
}) {
  const loaded = cantidad !== undefined;
  const [draft, setDraft] = useState(() => (loaded ? String(cantidad) : ""));
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const negative = loaded && cantidad < 0;

  async function commit() {
    if (savingRef.current) return;
    const parsed = parseCantidad(draft);
    if (parsed === null) {
      setDraft(loaded ? String(cantidad) : "");
      if (draft.trim()) {
        toast.error("La cantidad tiene que ser un número entero (0 o más).");
      }
      return;
    }
    if (loaded && parsed === cantidad) return;

    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase no está configurado.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    const { data, error } = await supabase.rpc("recuento_stock", {
      p_id_tienda: idTienda,
      p_id_producto: productId,
      p_cantidad: parsed,
    });
    savingRef.current = false;
    setSaving(false);

    if (error) {
      toast.error(error.message);
      setDraft(loaded ? String(cantidad) : "");
      return;
    }

    const next = Number(data);
    setDraft(String(next));
    onCommitted(productId, next);
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={draft}
      placeholder="—"
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "ml-auto h-8 w-20 text-right font-mono tabular-nums",
        negative && "text-destructive",
      )}
      aria-label={`Stock de ${productName}`}
    />
  );
}

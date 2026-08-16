"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProductoOption = {
  id: string;
  nombre: string;
};

type Destino = { id: string; nombre: string };

export function StockTransferDialog({
  open,
  onOpenChange,
  idTiendaOrigen,
  productos,
  stockByProductId,
  onTransferred,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idTiendaOrigen: string;
  productos: ProductoOption[];
  stockByProductId: Record<string, number>;
  onTransferred: (updates: Record<string, number>) => void;
}) {
  if (!open) return null;
  return (
    <StockTransferForm
      key={idTiendaOrigen}
      open={open}
      onOpenChange={onOpenChange}
      idTiendaOrigen={idTiendaOrigen}
      productos={productos}
      stockByProductId={stockByProductId}
      onTransferred={onTransferred}
    />
  );
}

function StockTransferForm({
  open,
  onOpenChange,
  idTiendaOrigen,
  productos,
  stockByProductId,
  onTransferred,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idTiendaOrigen: string;
  productos: ProductoOption[];
  stockByProductId: Record<string, number>;
  onTransferred: (updates: Record<string, number>) => void;
}) {
  const [destinos, setDestinos] = useState<Destino[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [destinoId, setDestinoId] = useState<string>("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadedIds = useMemo(
    () => new Set(Object.keys(stockByProductId)),
    [stockByProductId],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) {
      queueMicrotask(() => {
        if (!cancelled) setLoadError("Supabase no está configurado.");
      });
      return () => {
        cancelled = true;
      };
    }

    void supabase
      .rpc("tiendas_destino_traspaso", {
        p_id_tienda_origen: idTiendaOrigen,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          setDestinos([]);
          return;
        }
        setDestinos((data ?? []) as Destino[]);
      });

    return () => {
      cancelled = true;
    };
  }, [idTiendaOrigen]);

  const items = useMemo(() => {
    const out: { id_producto: string; cantidad: number }[] = [];
    for (const [id, raw] of Object.entries(qtys)) {
      const n = Number.parseInt(raw.trim(), 10);
      if (!Number.isFinite(n) || n < 1) continue;
      if (!loadedIds.has(id)) continue;
      const max = stockByProductId[id] ?? 0;
      if (n > max) continue;
      out.push({ id_producto: id, cantidad: n });
    }
    return out;
  }, [qtys, loadedIds, stockByProductId]);

  const invalidQty = useMemo(() => {
    for (const [id, raw] of Object.entries(qtys)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const n = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(n) || n < 1) return true;
      const max = stockByProductId[id];
      if (max === undefined || n > max) return true;
    }
    return false;
  }, [qtys, stockByProductId]);

  async function submit() {
    if (!destinoId || items.length === 0 || invalidQty || saving) return;
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase no está configurado.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc("traspasar_stock", {
      p_id_tienda_origen: idTiendaOrigen,
      p_id_tienda_destino: destinoId,
      p_items: items,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const payload = data as {
      lineas?: Array<{ id_producto: string; cantidad_origen: number }>;
    } | null;
    const updates: Record<string, number> = {};
    for (const line of payload?.lineas ?? []) {
      updates[line.id_producto] = Number(line.cantidad_origen);
    }
    onTransferred(updates);
    toast.success("Traspaso registrado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Traspasar stock</DialogTitle>
          <DialogDescription>
            Sale de esta tienda y entra en la de destino, al momento. Los
            productos sin cargar no se pueden mover.
          </DialogDescription>
        </DialogHeader>

        {destinos === null && !loadError ? (
          <div className="flex items-center gap-2 py-6 text-body-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando tiendas…
          </div>
        ) : loadError ? (
          <p className="text-body-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : destinos && destinos.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            No hay otra tienda activa en la organización.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-label">Tienda destino</p>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger aria-label="Tienda destino">
                  <SelectValue placeholder="Elegí una tienda" />
                </SelectTrigger>
                <SelectContent>
                  {(destinos ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {productos.map((p) => {
                const loaded = loadedIds.has(p.id);
                const max = loaded ? stockByProductId[p.id] : null;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border border-border px-3 py-2",
                      !loaded && "bg-muted/40 opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.nombre}</p>
                      <p className="text-caption text-muted-foreground">
                        {loaded ? `Disponible: ${max}` : "Sin cargar"}
                      </p>
                    </div>
                    <Input
                      type="text"
                      inputMode="numeric"
                      disabled={!loaded || saving}
                      value={qtys[p.id] ?? ""}
                      placeholder="0"
                      onChange={(e) =>
                        setQtys((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      className="h-8 w-16 text-right font-mono tabular-nums"
                      aria-label={`Cantidad a traspasar de ${p.nombre}`}
                    />
                  </li>
                );
              })}
            </ul>
            {invalidQty ? (
              <p className="text-body-sm text-destructive" role="alert">
                Hay cantidades inválidas o mayores al stock disponible.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={
              saving ||
              !destinoId ||
              items.length === 0 ||
              invalidQty ||
              !destinos ||
              destinos.length === 0
            }
          >
            {saving ? "Traspasando…" : "Traspasar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

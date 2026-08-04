"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChartColumn,
  Pencil,
  Plus,
  RotateCcw,
  Store,
  Trash2,
} from "lucide-react";
import { BrandMark } from "@/components/app/brand-mark";
import { ReportsView } from "@/app/(app)/reports/_components/reports-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PURGA_TIENDA_SOFT_DELETE_DIAS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Tienda = {
  id: string;
  nombre: string;
  created_at: string;
  eliminado_en?: string | null;
};

type OrgInfo = {
  nombre: string;
  plan: string | null;
  planNombre: string;
  exceso_tiendas_hasta: string | null;
  maxTiendas: number;
  tiendasActivas: number;
};

type StorePickerProps = {
  isAdmin: boolean;
  organizacionNombre: string;
  idOrganizacion: string;
  reportesMinYmd: string | null;
};

function diasRestantes(hasta: string | null): number | null {
  if (!hasta) return null;
  const end = new Date(hasta).getTime();
  if (Number.isNaN(end)) return null;
  const ms = end - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function StorePicker({
  isAdmin,
  organizacionNombre,
  idOrganizacion,
  reportesMinYmd,
}: StorePickerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"tiendas" | "reportes">("tiendas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [eliminadas, setEliminadas] = useState<Tienda[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [renaming, setRenaming] = useState(false);
  const renamingRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/stores");
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      organizacion?: OrgInfo;
      tiendas?: Tienda[];
      tiendasEliminadas?: Tienda[];
      rol?: string;
    };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No se pudieron cargar las tiendas.");
      setLoading(false);
      return;
    }
    setOrg(data.organizacion ?? null);
    setTiendas(data.tiendas ?? []);
    setEliminadas(data.tiendasEliminadas ?? []);
    setLoading(false);

    if (
      data.rol !== "admin" &&
      (data.tiendas?.length ?? 0) === 1 &&
      data.tiendas?.[0]
    ) {
      const idTienda = data.tiendas[0].id;
      const sel = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", idTienda }),
      });
      const selData = (await sel.json()) as { ok?: boolean; error?: string };
      if (sel.ok && selData.ok) {
        startTransition(() => {
          router.push("/dashboard");
          router.refresh();
        });
      }
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function selectStore(idTienda: string) {
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select", idTienda }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No se pudo seleccionar la tienda.");
      return;
    }
    startTransition(() => {
      router.push("/dashboard");
      router.refresh();
    });
  }

  async function createStore() {
    if (creatingRef.current) return;
    const nombre = nuevoNombre.trim();
    if (!nombre) return;

    creatingRef.current = true;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", nombre }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo crear la tienda.");
        return;
      }
      setNuevoNombre("");
      setShowCreate(false);
      await load();
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }

  function startRename(t: Tienda) {
    setEditingId(t.id);
    setEditNombre(t.nombre);
    setError(null);
  }

  function cancelRename() {
    setEditingId(null);
    setEditNombre("");
  }

  async function renameStore() {
    if (renamingRef.current || !editingId) return;
    const nombre = editNombre.trim();
    if (!nombre) return;

    renamingRef.current = true;
    setRenaming(true);
    setError(null);
    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          idTienda: editingId,
          nombre,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo renombrar la tienda.");
        return;
      }
      cancelRename();
      await load();
    } finally {
      renamingRef.current = false;
      setRenaming(false);
    }
  }

  async function deleteStore(idTienda: string, nombre: string) {
    if (
      !window.confirm(
        `¿Eliminar la tienda "${nombre}"? Sus usuarios quedarán inhabilitados. Podés restaurarla después si tu plan lo permite.`,
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", idTienda }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No se pudo eliminar.");
      return;
    }
    await load();
  }

  async function restoreStore(idTienda: string) {
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", idTienda }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No se pudo restaurar.");
      return;
    }
    await load();
  }

  async function purgeStore(idTienda: string, nombre: string) {
    if (
      !window.confirm(
        `¿Borrar definitivamente "${nombre}"?\n\nSe eliminarán para siempre todas las ventas y los usuarios de esta tienda. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Confirmá de nuevo: se borrarán ventas e usuarios de forma permanente.",
      )
    ) {
      return;
    }
    setError(null);
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge", idTienda }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      setError(data.error ?? "No se pudo borrar definitivamente.");
      return;
    }
    await load();
  }

  const dias = diasRestantes(org?.exceso_tiendas_hasta ?? null);
  const exceso =
    org &&
    org.exceso_tiendas_hasta &&
    org.tiendasActivas > org.maxTiendas
      ? org.tiendasActivas - org.maxTiendas
      : 0;

  const maxLabel =
    org && Number.isFinite(org.maxTiendas)
      ? String(org.maxTiendas)
      : "ilimitadas";
  const cupoLabel = org
    ? Number.isFinite(org.maxTiendas)
      ? `${org.tiendasActivas} de ${org.maxTiendas} tiendas`
      : `${org.tiendasActivas} tiendas (sin límite)`
    : null;
  const planTooltip = org
    ? org.plan
      ? `Tu plan ${org.planNombre} permite hasta ${maxLabel === "ilimitadas" ? "tiendas ilimitadas" : `${maxLabel} tienda${org.maxTiendas === 1 ? "" : "s"}`}.`
      : `Sin plan asignado (cortesía): se aplican los límites del plan ${org.planNombre} (hasta ${maxLabel} tiendas).`
    : "";

  return (
    <TooltipProvider>
    <div className="bg-atmosphere min-h-dvh">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full flex-col px-4 py-10",
          tab === "reportes" ? "max-w-[75rem]" : "max-w-lg",
        )}
      >
        <div className="mb-6">
          <BrandMark href="/" />
          <h1 className="mt-8 font-display text-3xl tracking-tight text-foreground">
            {tab === "reportes" ? "Reportes" : "Elegí una tienda"}
          </h1>
          <p className="mt-2 text-body-sm text-muted-foreground">
            {organizacionNombre}
          </p>

          {isAdmin ? (
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as "tiendas" | "reportes")}
              className="mt-5"
            >
              <TabsList>
                <TabsTrigger value="tiendas" className="gap-1.5">
                  <Store className="size-3.5" />
                  Tiendas
                </TabsTrigger>
                <TabsTrigger value="reportes" className="gap-1.5">
                  <ChartColumn className="size-3.5" />
                  Reportes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {tab === "tiendas" && cupoLabel ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="mt-3 cursor-help rounded-md border border-border bg-background/80 px-3 py-1.5 text-left text-body-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
                >
                  <span className="font-medium text-foreground">
                    {cupoLabel}
                  </span>
                  <span className="ml-1.5 text-caption">· límite del plan</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {planTooltip}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {tab === "reportes" && isAdmin ? (
          <div className="rounded-lg border border-border bg-background/60">
            <ReportsView
              scope="org"
              embedded
              idOrganizacion={idOrganizacion}
              initialVentas={[]}
              initialNamesByUser={{}}
              reportesMinYmd={reportesMinYmd}
            />
          </div>
        ) : (
          <>
        {org && exceso > 0 ? (
          <div
            className="mb-6 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-medium text-foreground">
                Tenés {exceso} tienda{exceso === 1 ? "" : "s"} de más para tu
                plan
              </p>
              <p className="mt-1 text-muted-foreground">
                Eliminá {exceso} tienda{exceso === 1 ? "" : "s"} antes de{" "}
                {dias != null
                  ? `${dias} día${dias === 1 ? "" : "s"}`
                  : "que venza el plazo"}
                . Si no lo hacés, se desactivarán automáticamente las más
                nuevas (y sus usuarios).
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tiendas.map((t) => (
              <li key={t.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-border bg-background/80 p-2",
                  )}
                >
                  {editingId === t.id ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void renameStore();
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="h-9"
                        autoFocus
                        aria-label="Nuevo nombre de la tienda"
                      />
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={renaming || !editNombre.trim()}
                          onClick={() => void renameStore()}
                        >
                          {renaming ? "Guardando…" : "Guardar"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={renaming}
                          onClick={cancelRename}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => void selectStore(t.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted"
                      >
                        <Store className="size-5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{t.nombre}</span>
                      </button>
                      {isAdmin ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Renombrar ${t.nombre}`}
                          onClick={() => startRename(t)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {isAdmin && tiendas.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${t.nombre}`}
                          onClick={() => void deleteStore(t.id, t.nombre)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {isAdmin ? (
          <div className="mt-6 space-y-3">
            {showCreate ? (
              <div className="space-y-3 rounded-lg border border-border bg-background/80 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre-tienda">Nombre de la tienda</Label>
                  <Input
                    id="nombre-tienda"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Sucursal Centro"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void createStore()}
                    disabled={creating || !nuevoNombre.trim()}
                  >
                    {creating ? "Creando…" : "Crear"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={creating}
                    onClick={() => {
                      setShowCreate(false);
                      setNuevoNombre("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={
                  !!org?.exceso_tiendas_hasta ||
                  (org != null && org.tiendasActivas >= org.maxTiendas)
                }
                onClick={() => setShowCreate(true)}
              >
                <Plus className="size-4" />
                Nueva tienda
              </Button>
            )}

            {eliminadas.length > 0 ? (
              <div className="pt-4">
                <p className="mb-2 text-caption font-medium text-muted-foreground">
                  Tiendas desactivadas
                </p>
                <div
                  className="mb-3 flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
                  role="status"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-destructive">
                    Las tiendas desactivadas se eliminan{" "}
                    <span className="font-semibold">permanentemente</span> a
                    los {PURGA_TIENDA_SOFT_DELETE_DIAS} días (unos 2 meses),
                    junto con sus ventas y usuarios. Restaurálas o borrálas
                    antes si necesitás.
                  </p>
                </div>
                <ul className="flex flex-col gap-2">
                  {eliminadas.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2"
                    >
                      <span className="truncate text-sm text-muted-foreground">
                        {t.nombre}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={
                            org != null && org.tiendasActivas >= org.maxTiendas
                          }
                          onClick={() => void restoreStore(t.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          Restaurar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void purgeStore(t.id, t.nombre)}
                        >
                          <Trash2 className="size-3.5" />
                          Borrar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
          </>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}

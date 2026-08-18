"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Minus,
  Package,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatArs } from "@/lib/format";
import { useStayOnNewSale } from "@/lib/preferences/stay-on-new-sale";
import { revalidateVentas } from "@/lib/ventas/actions";
import { cn } from "@/lib/utils";

type CategoriaRow = { id: string; nombre: string };
type ProductoRow = {
  id: string;
  id_categoria: string;
  nombre: string;
  precio_actual: number;
  nombre_busqueda: string;
};
type MedioPagoRow = { id: string; nombre: string };

type CartLine = {
  id_product: string;
  nombre: string;
  precio_actual: number;
  cantidad: number;
  descuento_porcentaje: number;
};

function clampDescuentoPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function precioUnitarioConDescuento(precioLista: number, descuentoPct: number) {
  const d = clampDescuentoPct(descuentoPct);
  return precioLista * (1 - d / 100);
}

function subtotalLinea(line: CartLine) {
  return (
    precioUnitarioConDescuento(
      line.precio_actual,
      line.descuento_porcentaje ?? 0,
    ) * line.cantidad
  );
}

const ALL_CATEGORY_ID = "__all__";

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function iconForMedioPago(nombre: string) {
  switch (nombre) {
    case "Efectivo":
      return Banknote;
    case "Mercado Pago":
      return QrCode;
    case "Transferencia":
      return Landmark;
    case "Tarjeta":
      return CreditCard;
    default:
      return CreditCard;
  }
}

function CartPanel({
  cartLines,
  cartSubtotal,
  descuentoMonto,
  setDescuentoMontoRaw,
  cartTotal,
  cartItemCount,
  mediosPago,
  selectedMedioId,
  setSelectedMedioId,
  setLineQty,
  setLineDescuento,
  registerError,
  canRegister,
  saleState,
  onRegister,
  stockWarnings,
  stayOnNewSale,
  setStayOnNewSale,
}: {
  cartLines: CartLine[];
  cartSubtotal: number;
  descuentoMonto: number;
  setDescuentoMontoRaw: (raw: string) => void;
  cartTotal: number;
  cartItemCount: number;
  mediosPago: MedioPagoRow[];
  selectedMedioId: string | null;
  setSelectedMedioId: (id: string) => void;
  setLineQty: (id: string, qty: number) => void;
  setLineDescuento: (id: string, raw: string) => void;
  registerError: string | null;
  canRegister: boolean;
  saleState: "idle" | "loading" | "success";
  onRegister: () => void;
  stockWarnings: { id: string; nombre: string; stock: number; qty: number }[];
  stayOnNewSale: boolean;
  setStayOnNewSale: (value: boolean) => void;
}) {
  const staySwitchId = useId();
  const isBusy = saleState === "loading" || saleState === "success";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <ShoppingCart className="size-[18px]" strokeWidth={1.75} />
        <h2 className="text-h3">
          Carrito
          {cartItemCount > 0 ? (
            <span className="ml-1.5 font-mono text-sm font-normal tabular-nums text-muted-foreground">
              ({cartItemCount})
            </span>
          ) : null}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {stockWarnings.length > 0 ? (
          <Alert className="mb-3">
            <AlertDescription>
              {stockWarnings.length === 1 ? (
                <>
                  {stockWarnings[0].nombre}: stock {stockWarnings[0].stock},
                  estás vendiendo {stockWarnings[0].qty}. Se puede confirmar
                  igual.
                </>
              ) : (
                <>
                  Hay {stockWarnings.length} productos por encima del stock.
                  Se puede confirmar igual.
                </>
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        {cartLines.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-muted-foreground">
            Todavía no hay nada en el carrito — tocá un producto para empezar.
          </p>
        ) : (
          <ul className="space-y-3">
            {cartLines.map((line) => {
              const d = clampDescuentoPct(line.descuento_porcentaje ?? 0);
              const unitEff = precioUnitarioConDescuento(
                line.precio_actual,
                d,
              );
              const sub = subtotalLinea({
                ...line,
                descuento_porcentaje: d,
              });
              return (
                <li
                  key={line.id_product}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {line.nombre}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <label
                        className="text-caption text-muted-foreground"
                        htmlFor={`desc-${line.id_product}`}
                      >
                        Desc. %
                      </label>
                      <Input
                        id={`desc-${line.id_product}`}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        step={1}
                        value={d}
                        onChange={(e) =>
                          setLineDescuento(line.id_product, e.target.value)
                        }
                        className="h-7 w-14 px-1.5 text-center font-mono text-xs tabular-nums"
                        aria-label={`Descuento porcentual para ${line.nombre}`}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-caption text-muted-foreground">
                        {d > 0 ? (
                          <>
                            <span className="line-through opacity-70">
                              {formatArs(line.precio_actual)}
                            </span>
                            <span className="ml-1.5 font-medium text-foreground">
                              −{d}%
                            </span>
                          </>
                        ) : (
                          <span>{formatArs(unitEff)} c/u</span>
                        )}
                      </p>
                      <p className="font-mono text-sm font-semibold tabular-nums">
                        {formatArs(sub)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label="Quitar uno"
                        disabled={isBusy}
                        onClick={() =>
                          setLineQty(line.id_product, line.cantidad - 1)
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="min-w-7 text-center font-mono text-sm font-semibold tabular-nums">
                        {line.cantidad}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-xs"
                        aria-label="Agregar uno"
                        disabled={isBusy}
                        onClick={() =>
                          setLineQty(line.id_product, line.cantidad + 1)
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-card p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-body-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono tabular-nums">
              {formatArs(cartSubtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="descuento-monto"
              className="text-body-sm text-muted-foreground"
            >
              Descuento ($)
            </label>
            <Input
              id="descuento-monto"
              type="number"
              inputMode="decimal"
              min={0}
              max={cartSubtotal > 0 ? cartSubtotal : undefined}
              step="0.01"
              value={descuentoMonto === 0 ? "" : String(descuentoMonto)}
              placeholder="0"
              disabled={isBusy || cartLines.length === 0}
              onChange={(e) => setDescuentoMontoRaw(e.target.value)}
              className="h-8 w-28 text-right font-mono tabular-nums"
              aria-label="Descuento en pesos sobre la venta"
            />
          </div>
          {descuentoMonto > 0 ? (
            <div className="flex items-center justify-between gap-2 text-body-sm text-amber-700 dark:text-amber-400">
              <span>Descuento aplicado</span>
              <span className="font-mono tabular-nums">
                −{formatArs(descuentoMonto)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5 border-t border-border pt-2">
            <span className="text-label text-muted-foreground">Total</span>
            <span
              className={cn(
                "text-display tabular-nums tracking-tight",
                descuentoMonto > 0 && "text-amber-700 dark:text-amber-400",
              )}
            >
              {formatArs(cartTotal)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-label text-muted-foreground">Medio de pago</p>
          {mediosPago.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              No hay medios de pago configurados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {mediosPago.map((m) => {
                const Icon = iconForMedioPago(m.nombre);
                const active = selectedMedioId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setSelectedMedioId(m.id)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors duration-100 disabled:opacity-60",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                    {m.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {registerError ? (
          <Alert variant="destructive">
            <AlertDescription>{registerError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor={staySwitchId} className="text-sm font-medium">
              Seguir vendiendo
            </Label>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Después de registrar, quedate en esta pantalla
            </p>
          </div>
          <Switch
            id={staySwitchId}
            checked={stayOnNewSale}
            onCheckedChange={(checked) => setStayOnNewSale(checked === true)}
            aria-label="Seguir vendiendo"
          />
        </div>

        <Button
          type="button"
          size="lg"
          className={cn(
            "w-full transition-colors duration-200",
            (saleState === "loading" || saleState === "success") &&
              "bg-success text-success-foreground hover:bg-success disabled:opacity-100",
          )}
          disabled={saleState !== "idle" || !canRegister}
          onClick={onRegister}
        >
          {saleState === "success" ? (
            <Check className="size-5" strokeWidth={2.5} />
          ) : saleState === "loading" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {saleState === "success"
            ? "Venta registrada"
            : saleState === "loading"
              ? "Registrando…"
              : "Registrar venta"}
        </Button>
      </div>
    </div>
  );
}

export function NewSaleView({
  idTienda,
  categorias: initialCategorias,
  productos: initialProductos,
  mediosPago: initialMedios,
  stockByProductId: initialStock,
  loadError: initialLoadError = null,
}: {
  idTienda: string;
  categorias: CategoriaRow[];
  productos: ProductoRow[];
  mediosPago: MedioPagoRow[];
  stockByProductId: Record<string, number> | null;
  loadError?: string | null;
}) {
  const PRODUCTOS_POR_PAGINA_MOBILE = 5;
  const PRODUCTOS_POR_PAGINA_DESKTOP = 12;
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [categorias] = useState<CategoriaRow[]>(initialCategorias);
  const [productos] = useState<ProductoRow[]>(initialProductos);
  const [mediosPago] = useState<MedioPagoRow[]>(initialMedios);
  const [stockByProductId, setStockByProductId] = useState<
    Record<string, number> | null
  >(initialStock);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string>(ALL_CATEGORY_ID);
  const [productSearch, setProductSearch] = useState("");
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [productosPorPagina, setProductosPorPagina] = useState(
    PRODUCTOS_POR_PAGINA_MOBILE,
  );
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [descuentoMontoRaw, setDescuentoMontoRaw] = useState("");
  const [selectedMedioId, setSelectedMedioId] = useState<string | null>(
    () => initialMedios[0]?.id ?? null,
  );
  const [loadError] = useState<string | null>(initialLoadError);
  const [registering, setRegistering] = useState(false);
  const registeringRef = useRef(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [saleState, setSaleState] = useState<"idle" | "loading" | "success">(
    "idle",
  );
  const [cartOpen, setCartOpen] = useState(false);
  const { stayOnNewSale, setStayOnNewSale } = useStayOnNewSale();
  const [flashProductId, setFlashProductId] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deferredProductSearch = useDeferredValue(productSearch);

  const cartLines = useMemo(
    () => Object.values(cart).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [cart],
  );

  const stockMap = useMemo(() => {
    if (!stockByProductId) return null;
    return new Map(Object.entries(stockByProductId));
  }, [stockByProductId]);

  const stockWarnings = useMemo(() => {
    if (!stockMap) return [];
    const out: { id: string; nombre: string; stock: number; qty: number }[] =
      [];
    for (const line of cartLines) {
      const stock = stockMap.get(line.id_product);
      if (stock === undefined) continue;
      if (line.cantidad > stock) {
        out.push({
          id: line.id_product,
          nombre: line.nombre,
          stock,
          qty: line.cantidad,
        });
      }
    }
    return out;
  }, [cartLines, stockMap]);

  const cartSubtotal = useMemo(
    () => cartLines.reduce((s, l) => s + subtotalLinea(l), 0),
    [cartLines],
  );

  const descuentoMonto = useMemo(() => {
    const n = parseFloat(descuentoMontoRaw.trim().replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(n, cartSubtotal);
  }, [descuentoMontoRaw, cartSubtotal]);

  const cartTotal = useMemo(
    () => Math.max(0, cartSubtotal - descuentoMonto),
    [cartSubtotal, descuentoMonto],
  );

  const cartItemCount = useMemo(
    () => cartLines.reduce((s, l) => s + l.cantidad, 0),
    [cartLines],
  );

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const applyByViewport = () => {
      setProductosPorPagina(
        media.matches
          ? PRODUCTOS_POR_PAGINA_DESKTOP
          : PRODUCTOS_POR_PAGINA_MOBILE,
      );
    };
    applyByViewport();
    media.addEventListener("change", applyByViewport);
    return () => media.removeEventListener("change", applyByViewport);
  }, []);

  const productosPorCategoria = useMemo(() => {
    if (selectedCategoryId === ALL_CATEGORY_ID) return productos;
    return productos.filter((p) => p.id_categoria === selectedCategoryId);
  }, [productos, selectedCategoryId]);

  const productosFiltrados = useMemo(() => {
    const q = searchFold(deferredProductSearch.trim());
    const base = q ? productos : productosPorCategoria;
    if (!q) return base;
    return base.filter((p) => p.nombre_busqueda.includes(q));
  }, [productos, productosPorCategoria, deferredProductSearch]);

  const totalProductPages = useMemo(
    () =>
      Math.max(1, Math.ceil(productosFiltrados.length / productosPorPagina)),
    [productosFiltrados.length, productosPorPagina],
  );

  const safeProductPage = Math.min(currentProductPage, totalProductPages);

  const productosPaginados = useMemo(() => {
    const start = (safeProductPage - 1) * productosPorPagina;
    return productosFiltrados.slice(start, start + productosPorPagina);
  }, [productosFiltrados, safeProductPage, productosPorPagina]);

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setProductSearch("");
    setCurrentProductPage(1);
  }

  function addToCart(p: ProductoRow) {
    setCart((prev) => {
      const cur = prev[p.id];
      if (cur) {
        return {
          ...prev,
          [p.id]: {
            ...cur,
            cantidad: cur.cantidad + 1,
            descuento_porcentaje: cur.descuento_porcentaje ?? 0,
          },
        };
      }
      return {
        ...prev,
        [p.id]: {
          id_product: p.id,
          nombre: p.nombre,
          precio_actual: Number(p.precio_actual),
          cantidad: 1,
          descuento_porcentaje: 0,
        },
      };
    });
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlashProductId(p.id);
    flashTimerRef.current = setTimeout(() => {
      setFlashProductId((id) => (id === p.id ? null : id));
      flashTimerRef.current = null;
    }, 150);
  }

  function setLineQty(id: string, qty: number) {
    if (qty < 1) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, cantidad: qty } };
    });
  }

  function setLineDescuento(id: string, raw: string) {
    const n = raw === "" ? 0 : Number.parseInt(raw, 10);
    const pct = raw === "" || Number.isNaN(n) ? 0 : clampDescuentoPct(n);
    setCart((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, descuento_porcentaje: pct } };
    });
  }

  async function handleRegistrarVenta() {
    if (registeringRef.current || saleState !== "idle") return;

    setRegisterError(null);
    if (!selectedMedioId || cartLines.length === 0) {
      setRegisterError(
        cartLines.length === 0
          ? "Agregá al menos un producto al carrito."
          : "Elegí un medio de pago.",
      );
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setRegisterError("Supabase no está configurado.");
      return;
    }

    registeringRef.current = true;
    setRegistering(true);
    setSaleState("loading");
    const payload = cartLines.map((l) => {
      const id = String(l.id_product).trim();
      const qty = Math.max(1, Math.floor(Number(l.cantidad)));
      return {
        id_product: id,
        id_producto: id,
        cantidad: qty,
        descuento_porcentaje: clampDescuentoPct(l.descuento_porcentaje),
      };
    });

    const { error } = await supabase.rpc("registrar_venta", {
      p_id_medio_pago: selectedMedioId,
      p_items: payload,
      p_descuento_monto: descuentoMonto,
      p_id_tienda: idTienda,
    });

    if (error) {
      registeringRef.current = false;
      setRegistering(false);
      setSaleState("idle");
      setRegisterError(error.message);
      return;
    }

    setSaleState("success");
    toast.success("Venta registrada");
    if (stockByProductId) {
      setStockByProductId((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        for (const line of cartLines) {
          if (line.id_product in next) {
            next[line.id_product] = next[line.id_product] - line.cantidad;
          }
        }
        return next;
      });
    }

    await Promise.all([
      revalidateVentas(),
      new Promise((resolve) => setTimeout(resolve, 900)),
    ]);

    setCart({});
    setDescuentoMontoRaw("");

    if (stayOnNewSale) {
      setSaleState("idle");
      registeringRef.current = false;
      setRegistering(false);
      setCartOpen(false);
      searchRef.current?.focus();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const canRegister =
    cartLines.length > 0 && selectedMedioId && !registering;

  const cartProps = {
    cartLines,
    cartSubtotal,
    descuentoMonto,
    setDescuentoMontoRaw,
    cartTotal,
    cartItemCount,
    mediosPago,
    selectedMedioId,
    setSelectedMedioId,
    setLineQty,
    setLineDescuento,
    registerError,
    canRegister: Boolean(canRegister),
    saleState,
    onRegister: () => void handleRegistrarVenta(),
    stockWarnings,
    stayOnNewSale,
    setStayOnNewSale,
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        title="Nueva venta"
        className="shrink-0"
        actions={
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="lg:hidden"
                aria-label="Abrir carrito"
              >
                <ShoppingCart />
                Carrito
                {cartItemCount > 0 ? (
                  <span className="font-mono tabular-nums">
                    ({cartItemCount})
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
              <SheetHeader className="sr-only">
                <SheetTitle>Carrito</SheetTitle>
              </SheetHeader>
              <div className="min-h-0 flex-1">
                <CartPanel {...cartProps} />
              </div>
            </SheetContent>
          </Sheet>
        }
      />

      {loadError ? (
        <div className="shrink-0 px-6 py-4">
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Product grid — surface-sunken para distinguir el POS del admin */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto bg-surface-sunken px-6 py-4 pb-24 lg:pb-4">
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={
                  selectedCategoryId === ALL_CATEGORY_ID ? "default" : "outline"
                }
                onClick={() => selectCategory(ALL_CATEGORY_ID)}
              >
                Todos
              </Button>
              {categorias.map((cat) => (
                <Button
                  key={cat.id}
                  type="button"
                  size="sm"
                  variant={
                    selectedCategoryId === cat.id ? "default" : "outline"
                  }
                  onClick={() => selectCategory(cat.id)}
                >
                  {cat.nombre}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                type="search"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setCurrentProductPage(1);
                }}
                placeholder="Buscar por nombre…"
                autoComplete="off"
                className="border-border bg-card pl-9"
                aria-label="Buscar productos por nombre"
              />
            </div>

            {productos.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No hay productos"
                description="Creá productos en la sección Productos para empezar a vender."
              />
            ) : productosFiltrados.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description={`No hay productos que coincidan con "${productSearch.trim()}".`}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {productosPaginados.map((prod) => {
                    const stock =
                      stockMap === null
                        ? undefined
                        : stockMap.get(prod.id);
                    const stockLabel =
                      stockMap === null
                        ? null
                        : stock === undefined
                          ? "—"
                          : String(stock);
                    return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addToCart(prod)}
                      className={cn(
                        "flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-left transition-colors duration-100 hover:bg-accent",
                        flashProductId === prod.id && "product-flash",
                      )}
                      aria-label={`Agregar ${prod.nombre}`}
                    >
                      <span className="min-w-0 truncate text-sm font-medium">
                        {prod.nombre}
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span className="font-mono text-body-sm tabular-nums text-muted-foreground">
                          {formatArs(Number(prod.precio_actual))}
                        </span>
                        {stockLabel !== null ? (
                          <span
                            className={cn(
                              "font-mono text-caption tabular-nums text-muted-foreground",
                              stock !== undefined && stock < 0 && "text-destructive",
                            )}
                          >
                            {stockLabel}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    );
                  })}
                </div>
                {productosFiltrados.length > productosPorPagina ? (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeProductPage === 1}
                      onClick={() =>
                        setCurrentProductPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Anterior
                    </Button>
                    <span className="text-body-sm text-muted-foreground">
                      {safeProductPage} / {totalProductPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safeProductPage === totalProductPages}
                      onClick={() =>
                        setCurrentProductPage((p) =>
                          Math.min(totalProductPages, p + 1),
                        )
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <Separator orientation="vertical" className="hidden lg:block" />

          {/* Desktop cart — altura fija al viewport, botón siempre visible */}
          <aside className="hidden h-full w-[22.5rem] shrink-0 overflow-hidden border-l border-border bg-card lg:block">
            <CartPanel {...cartProps} />
          </aside>
        </div>

      {/* Mobile cart bar */}
      {cartItemCount > 0 ? (
        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-border bg-card p-3 lg:hidden">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart />
            Ver carrito · {formatArs(cartTotal)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

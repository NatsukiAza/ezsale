"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type CategoriaRow = { id: string; nombre: string };
type ProductoRow = {
  id: string;
  nombre: string;
  precio_actual: number;
};
type MedioPagoRow = { id: string; nombre: string };

type CartLine = {
  id_product: string;
  nombre: string;
  precio_actual: number;
  cantidad: number;
};

/** Categoría virtual: todos los productos de la tienda */
const ALL_CATEGORY_ID = "__all__";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

/** Normaliza para búsqueda (minúsculas, sin acentos) */
function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function NewSaleView() {
  const router = useRouter();
  const [idTienda, setIdTienda] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [mediosPago, setMediosPago] = useState<MedioPagoRow[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string>(ALL_CATEGORY_ID);
  const [productSearch, setProductSearch] = useState("");
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [selectedMedioId, setSelectedMedioId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const cartLines = useMemo(
    () => Object.values(cart).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [cart],
  );

  const cartTotal = useMemo(
    () => cartLines.reduce((s, l) => s + l.precio_actual * l.cantidad, 0),
    [cartLines],
  );

  const cartItemCount = useMemo(
    () => cartLines.reduce((s, l) => s + l.cantidad, 0),
    [cartLines],
  );

  const loadInitial = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoadError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("Iniciá sesión para registrar ventas.");
      setLoading(false);
      return;
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("id_tienda")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilErr || !perfil?.id_tienda) {
      setLoadError(perfilErr?.message ?? "No se encontró tu tienda.");
      setLoading(false);
      return;
    }

    const tid = perfil.id_tienda as string;
    setIdTienda(tid);

    const [{ data: cats, error: catErr }, { data: medios, error: medErr }] =
      await Promise.all([
        supabase
          .from("categorias")
          .select("id, nombre")
          .eq("id_tienda", tid)
          .order("nombre"),
        supabase.from("medios_pago").select("id, nombre").order("nombre"),
      ]);

    if (catErr) {
      setLoadError(catErr.message);
      setLoading(false);
      return;
    }
    if (medErr) {
      setLoadError(medErr.message);
      setLoading(false);
      return;
    }

    const list = (cats ?? []) as CategoriaRow[];
    setCategorias(list);
    setMediosPago((medios ?? []) as MedioPagoRow[]);
    setSelectedCategoryId(ALL_CATEGORY_ID);
    const medList = (medios ?? []) as MedioPagoRow[];
    if (medList.length > 0) {
      setSelectedMedioId(medList[0].id);
    }
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadProductos = useCallback(
    async (tid: string, categoriaId: string) => {
      const supabase = createClient();
      if (!supabase) return;
      setLoadingProducts(true);
      let q = supabase
        .from("productos")
        .select("id, nombre, precio_actual")
        .eq("id_tienda", tid)
        .order("nombre");
      if (categoriaId !== ALL_CATEGORY_ID) {
        q = q.eq("id_categoria", categoriaId);
      }
      const { data, error } = await q;
      setLoadingProducts(false);
      if (error) {
        setLoadError(error.message);
        setProductos([]);
        return;
      }
      setProductos((data ?? []) as ProductoRow[]);
    },
    [],
  );

  useEffect(() => {
    if (!idTienda) {
      setProductos([]);
      return;
    }
    void loadProductos(idTienda, selectedCategoryId);
  }, [idTienda, selectedCategoryId, loadProductos]);

  const productosFiltrados = useMemo(() => {
    const q = searchFold(productSearch.trim());
    if (!q) return productos;
    return productos.filter((p) => searchFold(p.nombre).includes(q));
  }, [productos, productSearch]);

  function addToCart(p: ProductoRow) {
    setCart((prev) => {
      const cur = prev[p.id];
      if (cur) {
        return {
          ...prev,
          [p.id]: { ...cur, cantidad: cur.cantidad + 1 },
        };
      }
      return {
        ...prev,
        [p.id]: {
          id_product: p.id,
          nombre: p.nombre,
          precio_actual: Number(p.precio_actual),
          cantidad: 1,
        },
      };
    });
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

  async function handleRegistrarVenta() {
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

    setRegistering(true);
    const payload = cartLines.map((l) => {
      const id = String(l.id_product).trim();
      const qty = Math.max(1, Math.floor(Number(l.cantidad)));
      return {
        id_product: id,
        id_producto: id,
        cantidad: qty,
      };
    });

    const { error } = await supabase.rpc("registrar_venta", {
      p_id_medio_pago: selectedMedioId,
      p_items: payload,
    });

    setRegistering(false);

    if (error) {
      setRegisterError(error.message);
      return;
    }

    setCart({});
    router.push("/dashboard");
    router.refresh();
  }

  const canRegister =
    cartLines.length > 0 && selectedMedioId && !registering && !loading;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-stone-50/80 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-stone-100 p-2 text-primary shadow-sm ring-1 ring-stone-300/90 transition-colors duration-200 hover:bg-stone-200 active:scale-95"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline text-xl font-extrabold tracking-tighter text-primary-dim">
            EZSale
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label text-[10px] tracking-widest text-stone-500 uppercase">
            Nueva venta
          </span>
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-px bg-stone-200/50" />
      </nav>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-24 pb-16">
        {loadError ? (
          <p
            className="rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-on-surface-variant">Cargando…</p>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="font-label text-[10px] font-medium tracking-widest text-stone-500 uppercase">
                  Categorías
                </span>
              </div>
              <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(ALL_CATEGORY_ID);
                    setProductSearch("");
                  }}
                  className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                    selectedCategoryId === ALL_CATEGORY_ID
                      ? "bg-primary text-on-primary shadow-md"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Todos
                </button>
                {categorias.map((cat) => {
                  const active = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setProductSearch("");
                      }}
                      className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "bg-primary text-on-primary shadow-md"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {cat.nombre}
                    </button>
                  );
                })}
              </div>
              {categorias.length === 0 ? (
                <p className="px-2 text-xs text-on-surface-variant">
                  No tenés categorías propias todavía; igual podés ver todos los
                  productos con &quot;Todos&quot; o creá categorías en
                  Productos.
                </p>
              ) : null}
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-label text-[10px] font-medium tracking-widest text-stone-500 uppercase">
                  Productos
                </span>
                <div className="relative w-full sm:max-w-md">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-symbols-outlined text-lg text-outline">
                      search
                    </span>
                  </div>
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por nombre…"
                    autoComplete="off"
                    className="w-full rounded-xl border-none bg-surface-container-low py-2.5 pr-3 pl-10 text-on-surface outline-none ring-1 ring-stone-200/80 transition-all placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30"
                    aria-label="Buscar productos por nombre"
                  />
                </div>
              </div>
              {loadingProducts ? (
                <p className="text-sm text-on-surface-variant">
                  Cargando productos…
                </p>
              ) : productos.length === 0 ? (
                <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 px-4 py-6 text-sm text-on-surface-variant">
                  {selectedCategoryId === ALL_CATEGORY_ID
                    ? "No hay productos en tu tienda."
                    : "No hay productos en esta categoría."}
                </p>
              ) : productosFiltrados.length === 0 ? (
                <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 px-4 py-6 text-sm text-on-surface-variant">
                  No hay productos que coincidan con &quot;
                  {productSearch.trim()}
                  &quot;.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {productosFiltrados.map((prod) => (
                    <div
                      key={prod.id}
                      className="group flex items-center justify-between rounded-2xl border border-stone-100 bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-bold text-on-surface">
                          {prod.nombre}
                        </h3>
                        <p className="font-bold text-primary">
                          {formatMoney(Number(prod.precio_actual))}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        className="shrink-0 flex items-center justify-center rounded-full bg-primary p-3 text-on-primary shadow-lg transition-transform active:scale-90"
                        aria-label={`Agregar ${prod.nombre}`}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          add
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-[2.5rem] border border-stone-200/50 bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  shopping_basket
                </span>
                <h2 className="font-headline text-lg font-extrabold">
                  Carrito ({cartItemCount}{" "}
                  {cartItemCount === 1 ? "ítem" : "ítems"})
                </h2>
              </div>
              {cartLines.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Todavía no agregaste productos.
                </p>
              ) : (
                <ul className="space-y-3">
                  {cartLines.map((line) => (
                    <li
                      key={line.id_product}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-surface-container-low px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-on-surface">
                          {line.nombre}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {formatMoney(line.precio_actual)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-surface-container-high px-2 py-1 text-lg leading-none text-on-surface"
                          aria-label="Quitar uno"
                          onClick={() =>
                            setLineQty(line.id_product, line.cantidad - 1)
                          }
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center font-bold tabular-nums">
                          {line.cantidad}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg bg-surface-container-high px-2 py-1 text-lg leading-none text-on-surface"
                          aria-label="Agregar uno"
                          onClick={() =>
                            setLineQty(line.id_product, line.cantidad + 1)
                          }
                        >
                          +
                        </button>
                        <span className="min-w-22 text-right font-bold text-primary">
                          {formatMoney(line.precio_actual * line.cantidad)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between border-t border-stone-200/60 pt-4">
                <span className="font-label text-[10px] tracking-widest text-stone-500 uppercase">
                  Total
                </span>
                <span className="font-headline text-2xl font-extrabold text-on-surface">
                  {formatMoney(cartTotal)}
                </span>
              </div>
            </section>

            <section className="space-y-6 rounded-[2.5rem] border border-stone-200/50 bg-stone-100 p-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">
                  payments
                </span>
                <h2 className="font-headline text-xl font-extrabold">
                  Método de pago
                </h2>
              </div>
              {mediosPago.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  No hay medios de pago configurados. Ejecutá las migraciones en
                  Supabase.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {mediosPago.map((m) => {
                    const active = selectedMedioId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMedioId(m.id)}
                        className={`flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-5 font-bold shadow-sm transition-all active:scale-95 ${
                          active
                            ? "border-primary bg-surface-container-lowest text-primary"
                            : "border-stone-200 bg-surface-container-lowest font-medium text-stone-500 hover:bg-stone-50"
                        }`}
                      >
                        <span className="material-symbols-outlined text-3xl">
                          {m.nombre === "Efectivo"
                            ? "payments"
                            : m.nombre === "Mercado Pago"
                              ? "qr_code_2"
                              : "credit_card"}
                        </span>
                        <span className="text-xs">{m.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {registerError ? (
                <p
                  className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                  role="alert"
                >
                  {registerError}
                </p>
              ) : null}

              <button
                type="button"
                disabled={!canRegister}
                onClick={() => void handleRegistrarVenta()}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-linear-to-br from-primary to-primary-dim py-6 text-xl font-bold text-on-primary shadow-xl shadow-primary/30 transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {registering ? "Registrando…" : "Registrar venta"}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopAppBar } from "./top-app-bar";

type CategoriaListItem = {
  id: string;
  nombre: string;
  id_padre: string | null;
  parentNombre: string | null;
};

type ProductoListItem = {
  id: string;
  nombre: string;
  descripcion: string;
  precio_actual: number;
  categoriaNombre: string | null;
};

type ActiveTab = "productos" | "categorias";
type ModalKind = "producto" | "categoria";

function categoriaNombreFromJoin(
  row: { categorias: unknown },
): string | null {
  const c = row.categorias;
  if (c == null) return null;
  if (Array.isArray(c)) {
    const first = c[0] as { nombre?: string } | undefined;
    return first?.nombre ?? null;
  }
  return (c as { nombre: string }).nombre;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

export function ProductsView() {
  const [idTienda, setIdTienda] = useState<string | null>(null);
  const [categoriasList, setCategoriasList] = useState<CategoriaListItem[]>([]);
  const [productos, setProductos] = useState<ProductoListItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("productos");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind>("producto");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [idCategoria, setIdCategoria] = useState("");

  const [catNombre, setCatNombre] = useState("");
  const [esSubcategoria, setEsSubcategoria] = useState(false);
  const [idPadre, setIdPadre] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmitProducto = useMemo(() => {
    const n = nombre.trim();
    const d = descripcion.trim();
    const p = precio.trim();
    if (!n || !d || !idCategoria || !p) return false;
    const num = parseFloat(p.replace(",", "."));
    if (!Number.isFinite(num) || num < 0) return false;
    return true;
  }, [nombre, descripcion, precio, idCategoria]);

  const canSubmitCategoria = useMemo(() => {
    const n = catNombre.trim();
    if (!n) return false;
    if (esSubcategoria) {
      return idPadre.length > 0;
    }
    return true;
  }, [catNombre, esSubcategoria, idPadre]);

  const canSubmit =
    modalKind === "producto" ? canSubmitProducto : canSubmitCategoria;

  const loadData = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoadError("Supabase no está configurado.");
      setLoadingList(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("Sesión no válida.");
      setLoadingList(false);
      return;
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from("perfiles")
      .select("id_tienda")
      .eq("id", user.id)
      .maybeSingle();

    if (perfilErr || !perfil?.id_tienda) {
      setLoadError(perfilErr?.message ?? "No se encontró tu tienda.");
      setLoadingList(false);
      return;
    }

    const tid = perfil.id_tienda as string;
    setIdTienda(tid);

    const [{ data: cats, error: catErr }, { data: prods, error: prodErr }] =
      await Promise.all([
        supabase
          .from("categorias")
          .select("id, nombre, id_padre")
          .eq("id_tienda", tid)
          .order("nombre"),
        supabase
          .from("productos")
          .select("id, nombre, descripcion, precio_actual, categorias ( nombre )")
          .eq("id_tienda", tid)
          .order("nombre"),
      ]);

    if (catErr) {
      setLoadError(catErr.message);
    } else if (prodErr) {
      setLoadError(prodErr.message);
    } else {
      setLoadError(null);
      const catRows = (cats ?? []) as {
        id: string;
        nombre: string;
        id_padre: string | null;
      }[];
      const idToName = new Map(catRows.map((c) => [c.id, c.nombre]));
      setCategoriasList(
        catRows.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          id_padre: c.id_padre,
          parentNombre: c.id_padre ? idToName.get(c.id_padre) ?? null : null,
        })),
      );
      const rows = prods ?? [];
      setProductos(
        rows.map((row) => ({
          id: row.id as string,
          nombre: row.nombre as string,
          descripcion: row.descripcion as string,
          precio_actual: Number(row.precio_actual),
          categoriaNombre: categoriaNombreFromJoin(row as { categorias: unknown }),
        })),
      );
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    setModalOpen(false);
  }

  function openModal() {
    setFormError(null);
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setIdCategoria("");
    setCatNombre("");
    setEsSubcategoria(false);
    setIdPadre("");
    setModalKind(activeTab === "productos" ? "producto" : "categoria");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  async function handleSubmitProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitProducto) return;
    if (!idTienda) {
      setFormError("No se pudo obtener tu tienda. Recargá la página.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setFormError("Supabase no está configurado.");
      return;
    }

    const precioNum = parseFloat(precio.trim().replace(",", "."));
    setSaving(true);
    setFormError(null);

    const { error } = await supabase.from("productos").insert({
      id_tienda: idTienda,
      id_categoria: idCategoria,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio_actual: precioNum,
    });

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setModalOpen(false);
    setLoadingList(true);
    await loadData();
  }

  async function handleSubmitCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitCategoria) return;
    if (!idTienda) {
      setFormError("No se pudo obtener tu tienda. Recargá la página.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setFormError("Supabase no está configurado.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const { error } = await supabase.from("categorias").insert({
      id_tienda: idTienda,
      nombre: catNombre.trim(),
      id_padre: esSubcategoria && idPadre ? idPadre : null,
    });

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setModalOpen(false);
    setLoadingList(true);
    await loadData();
  }

  const fabLabel =
    activeTab === "productos"
      ? "Agregar nuevo producto"
      : "Agregar nueva categoría";

  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref="/products" />
      <main className="mx-auto max-w-5xl px-6 pt-24">
        <div className="mb-8">
          <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-on-surface">
            Productos e Inventario
          </h2>
          <p className="text-on-surface-variant">
            Administra el catálogo de productos y organiza tus categorías.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-4 md:flex-row">
          <div className="relative grow">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input
              className="w-full rounded-xl border-none bg-surface-container-low py-3 pr-4 pl-11 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30"
              placeholder={
                activeTab === "productos"
                  ? "Buscar por nombre o SKU..."
                  : "Buscar categoría por nombre..."
              }
              type="search"
              name="q"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-3 font-medium text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filtrar
            </button>
          </div>
        </div>

        <div className="mb-8 flex gap-8 border-b border-outline-variant/15">
          <button
            type="button"
            onClick={() => selectTab("productos")}
            className={
              activeTab === "productos"
                ? "border-b-2 border-primary pb-4 font-bold text-primary transition-all"
                : "pb-4 font-medium text-on-surface-variant transition-all hover:text-on-surface"
            }
          >
            Productos
          </button>
          <button
            type="button"
            onClick={() => selectTab("categorias")}
            className={
              activeTab === "categorias"
                ? "border-b-2 border-primary pb-4 font-bold text-primary transition-all"
                : "pb-4 font-medium text-on-surface-variant transition-all hover:text-on-surface"
            }
          >
            Categorías
          </button>
        </div>

        {loadError ? (
          <p
            className="mb-6 rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        <div className="space-y-3">
          {loadingList ? (
            <p className="text-on-surface-variant">
              {activeTab === "productos"
                ? "Cargando productos…"
                : "Cargando categorías…"}
            </p>
          ) : activeTab === "productos" ? (
            productos.length === 0 ? (
              <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 px-6 py-10 text-center text-on-surface-variant">
                No hay productos todavía. Usá el botón + para agregar el primero.
              </p>
            ) : (
              productos.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center justify-between rounded-2xl border border-transparent bg-surface-container-lowest p-4 transition-all duration-300 hover:border-surface-container-high hover:bg-white hover:shadow-xl hover:shadow-on-surface/5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-surface-container-high">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                        inventory_2
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-on-surface">{p.nombre}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-secondary-container px-2 py-0.5 font-label text-xs tracking-widest text-on-secondary-container uppercase">
                          {p.categoriaNombre ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-label text-xs tracking-widest text-outline uppercase">
                        Precio
                      </p>
                      <p className="text-xl font-bold text-primary">
                        {formatPrice(Number(p.precio_actual))}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary-container/20 hover:text-primary"
                        aria-label="Editar"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error-container/20 hover:text-error"
                        aria-label="Eliminar"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : categoriasList.length === 0 ? (
            <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 px-6 py-10 text-center text-on-surface-variant">
              No hay categorías todavía. Usá el botón + para crear la primera.
            </p>
          ) : (
            categoriasList.map((c) => (
              <div
                key={c.id}
                className="group flex items-center justify-between rounded-2xl border border-transparent bg-surface-container-lowest p-4 transition-all duration-300 hover:border-surface-container-high hover:bg-white hover:shadow-xl hover:shadow-on-surface/5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-surface-container-high">
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                      category
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">{c.nombre}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {c.id_padre && c.parentNombre ? (
                        <span className="rounded-md bg-tertiary-container/80 px-2 py-0.5 font-label text-xs tracking-widest text-on-tertiary-container uppercase">
                          Subcategoría · {c.parentNombre}
                        </span>
                      ) : (
                        <span className="rounded-md bg-secondary-container px-2 py-0.5 font-label text-xs tracking-widest text-on-secondary-container uppercase">
                          Categoría principal
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-primary-container/20 hover:text-primary"
                    aria-label="Editar"
                  >
                    <span className="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-on-surface-variant transition-all hover:bg-error-container/20 hover:text-error"
                    aria-label="Eliminar"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <button
        type="button"
        onClick={openModal}
        className="group fixed right-6 bottom-8 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-container text-on-primary shadow-2xl transition-transform duration-150 active:scale-95"
        aria-label={fabLabel}
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <div className="pointer-events-none absolute right-full mr-4 rounded-lg bg-inverse-surface px-4 py-2 text-sm whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100">
          {fabLabel}
        </div>
      </button>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            modalKind === "producto" ? "add-product-title" : "add-cat-title"
          }
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar"
            onClick={closeModal}
          />
          <div
            className="relative z-10 w-full max-w-lg rounded-4xl border border-stone-200/80 bg-surface-container-lowest p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {modalKind === "producto" ? (
              <>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="add-product-title"
                      className="font-headline text-2xl font-extrabold text-on-surface"
                    >
                      Nuevo producto
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Completá todos los campos para guardar en tu tienda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    aria-label="Cerrar"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitProducto} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="prod-nombre">
                      Nombre *
                    </label>
                    <input
                      id="prod-nombre"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                      placeholder="Ej. Hamburguesa clásica"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="prod-desc">
                      Descripción *
                    </label>
                    <textarea
                      id="prod-desc"
                      required
                      rows={3}
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className="w-full resize-none rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                      placeholder="Ingredientes, presentación, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="prod-precio">
                      Precio *
                    </label>
                    <input
                      id="prod-precio"
                      type="text"
                      inputMode="decimal"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                      placeholder="0.00"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="prod-cat">
                      Categoría *
                    </label>
                    <select
                      id="prod-cat"
                      required
                      value={idCategoria}
                      onChange={(e) => setIdCategoria(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="">Seleccioná una categoría</option>
                      {categoriasList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    {categoriasList.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">
                        Primero creá al menos una categoría en la pestaña Categorías.
                      </p>
                    ) : null}
                  </div>

                  {formError ? (
                    <p
                      className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || saving}
                      className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar producto"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="add-cat-title"
                      className="font-headline text-2xl font-extrabold text-on-surface"
                    >
                      Nueva categoría
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Nombre obligatorio. Marcá si es subcategoría y elegí la categoría padre.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                    aria-label="Cerrar"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitCategoria} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="cat-nombre">
                      Nombre *
                    </label>
                    <input
                      id="cat-nombre"
                      value={catNombre}
                      onChange={(e) => setCatNombre(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                      placeholder="Ej. Bebidas"
                      autoComplete="off"
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 ring-1 ring-stone-200/80">
                    <input
                      type="checkbox"
                      checked={esSubcategoria}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setEsSubcategoria(on);
                        if (!on) setIdPadre("");
                      }}
                      className="h-4 w-4 rounded border-outline text-primary focus:ring-primary/40"
                    />
                    <span className="text-sm font-medium text-on-surface">
                      Es subcategoría
                    </span>
                  </label>

                  {esSubcategoria ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="cat-padre">
                        Categoría padre *
                      </label>
                      <select
                        id="cat-padre"
                        value={idPadre}
                        onChange={(e) => setIdPadre(e.target.value)}
                        disabled={categoriasList.length === 0}
                        className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                      >
                        <option value="">Seleccioná la categoría padre</option>
                        {categoriasList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </select>
                      {categoriasList.length === 0 ? (
                        <p className="text-xs text-on-surface-variant">
                          Creá primero una categoría principal sin marcar &quot;Es
                          subcategoría&quot;.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {formError ? (
                    <p
                      className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || saving}
                      className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Guardando…" : "Guardar categoría"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

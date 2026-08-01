"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Money } from "@/components/app/money";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductoFormDialog } from "./producto-form-dialog";
import { CategoriaFormDialog } from "./categoria-form-dialog";

type CategoriaListItem = {
  id: string;
  nombre: string;
  id_padre: string | null;
  parentNombre: string | null;
};

type ProductoListItem = {
  id: string;
  id_categoria: string;
  nombre: string;
  descripcion: string;
  precio_actual: number;
  categoriaNombre: string | null;
  searchText: string;
};

/** Normaliza para búsqueda (minúsculas, sin acentos) */
function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type ActiveTab = "productos" | "categorias";
type ModalKind = "producto" | "categoria";
type DeleteTarget =
  | { kind: "producto"; item: ProductoListItem }
  | { kind: "categoria"; item: CategoriaListItem };

const FILTRO_TODAS = "__todas__";

/** IDs de una categoría y todas sus subcategorías (árbol). */
function collectCategoriaTreeIds(
  rootId: string,
  categorias: { id: string; id_padre: string | null }[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const c of categorias) {
    if (!c.id_padre) continue;
    const list = childrenByParent.get(c.id_padre) ?? [];
    list.push(c.id);
    childrenByParent.set(c.id_padre, list);
  }
  const out: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    out.push(id);
    const kids = childrenByParent.get(id);
    if (kids) stack.push(...kids);
  }
  return out;
}

function categoriaNombreFromJoin(row: { categorias: unknown }): string | null {
  const c = row.categorias;
  if (c == null) return null;
  if (Array.isArray(c)) {
    const first = c[0] as { nombre?: string } | undefined;
    return first?.nombre ?? null;
  }
  return (c as { nombre: string }).nombre;
}

export function ProductsView({
  idTienda,
  isAdmin,
  initialCategorias,
  initialProductos,
  initialLoadError = null,
}: {
  idTienda: string;
  isAdmin: boolean;
  initialCategorias: CategoriaListItem[];
  initialProductos: ProductoListItem[];
  initialLoadError?: string | null;
}) {
  const PRODUCTOS_POR_PAGINA = 10;
  const [categoriasList, setCategoriasList] =
    useState<CategoriaListItem[]>(initialCategorias);
  const [productos, setProductos] =
    useState<ProductoListItem[]>(initialProductos);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [loadingList, setLoadingList] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("productos");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategoriaId, setFilterCategoriaId] = useState<string | null>(
    null,
  );
  const [currentProductPage, setCurrentProductPage] = useState(1);
  const [editingProductoId, setEditingProductoId] = useState<string | null>(
    null,
  );
  const [editingCategoriaId, setEditingCategoriaId] = useState<string | null>(
    null,
  );

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

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Modo planilla: editar precios en masa y guardar en un solo RPC. */
  const [priceEditMode, setPriceEditMode] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingPrices, setSavingPrices] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const deleteCategoriaTreeIds = useMemo(() => {
    if (!deleteTarget || deleteTarget.kind !== "categoria") return null;
    return collectCategoriaTreeIds(deleteTarget.item.id, categoriasList);
  }, [deleteTarget, categoriasList]);

  const deleteCategoriaProductCount = useMemo(() => {
    if (!deleteCategoriaTreeIds) return 0;
    const idSet = new Set(deleteCategoriaTreeIds);
    return productos.filter((p) => idSet.has(p.id_categoria)).length;
  }, [deleteCategoriaTreeIds, productos]);

  const deleteCategoriaSubCount = useMemo(() => {
    if (!deleteCategoriaTreeIds) return 0;
    return Math.max(0, deleteCategoriaTreeIds.length - 1);
  }, [deleteCategoriaTreeIds]);

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

  const productosFiltrados = useMemo(() => {
    let list = productos;
    if (filterCategoriaId) {
      list = list.filter((p) => p.id_categoria === filterCategoriaId);
    }
    const q = searchFold(deferredSearchQuery.trim());
    if (!q) return list;
    return list.filter((p) => p.searchText.includes(q));
  }, [productos, deferredSearchQuery, filterCategoriaId]);

  const nombreFiltroCategoria = useMemo(() => {
    if (!filterCategoriaId) return null;
    return (
      categoriasList.find((c) => c.id === filterCategoriaId)?.nombre ?? null
    );
  }, [categoriasList, filterCategoriaId]);

  const totalProductPages = useMemo(() => {
    return Math.max(
      1,
      Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA),
    );
  }, [productosFiltrados.length]);

  const productosPaginados = useMemo(() => {
    if (priceEditMode) return productosFiltrados;
    const start = (currentProductPage - 1) * PRODUCTOS_POR_PAGINA;
    return productosFiltrados.slice(start, start + PRODUCTOS_POR_PAGINA);
  }, [productosFiltrados, currentProductPage, priceEditMode]);

  const precioOriginalById = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productos) map.set(p.id, p.precio_actual);
    return map;
  }, [productos]);

  const changedPriceItems = useMemo(() => {
    const items: { id: string; precio_actual: number }[] = [];
    for (const [id, raw] of Object.entries(priceDrafts)) {
      const original = precioOriginalById.get(id);
      if (original === undefined) continue;
      const num = parseFloat(raw.trim().replace(",", "."));
      if (!Number.isFinite(num) || num < 0) continue;
      if (num !== original) {
        items.push({ id, precio_actual: num });
      }
    }
    return items;
  }, [priceDrafts, precioOriginalById]);

  const hasInvalidPriceDraft = useMemo(() => {
    for (const [id, raw] of Object.entries(priceDrafts)) {
      if (!precioOriginalById.has(id)) continue;
      const trimmed = raw.trim();
      if (!trimmed) return true;
      const num = parseFloat(trimmed.replace(",", "."));
      if (!Number.isFinite(num) || num < 0) return true;
    }
    return false;
  }, [priceDrafts, precioOriginalById]);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoadError("Supabase no está configurado.");
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    const tid = idTienda;

    const [{ data: cats, error: catErr }, { data: prods, error: prodErr }] =
      await Promise.all([
        supabase
          .from("categorias")
          .select("id, nombre, id_padre")
          .eq("id_tienda", tid)
          .is("eliminado_en", null)
          .order("nombre"),
        supabase
          .from("productos")
          .select(
            "id, id_categoria, nombre, descripcion, precio_actual, categorias ( nombre )",
          )
          .eq("id_tienda", tid)
          .is("eliminado_en", null)
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
          parentNombre: c.id_padre ? (idToName.get(c.id_padre) ?? null) : null,
        })),
      );
      const rows = prods ?? [];
      setProductos(
        rows.map((row) => {
          const nombreRow = row.nombre as string;
          const descripcionRow = row.descripcion as string;
          const categoriaNombre = categoriaNombreFromJoin(
            row as { categorias: unknown },
          );
          return {
            id: row.id as string,
            id_categoria: row.id_categoria as string,
            nombre: nombreRow,
            descripcion: descripcionRow,
            precio_actual: Number(row.precio_actual),
            categoriaNombre,
            searchText: searchFold(
              `${nombreRow} ${descripcionRow} ${categoriaNombre ?? ""}`,
            ),
          };
        }),
      );
    }
    setLoadingList(false);
  }, [idTienda]);

  useEffect(() => {
    setCurrentProductPage(1);
  }, [searchQuery, filterCategoriaId]);

  useEffect(() => {
    if (currentProductPage > totalProductPages) {
      setCurrentProductPage(totalProductPages);
    }
  }, [currentProductPage, totalProductPages]);

  function enterPriceEditMode() {
    if (!isAdmin) return;
    const drafts: Record<string, string> = {};
    for (const p of productos) {
      drafts[p.id] = String(p.precio_actual);
    }
    setPriceDrafts(drafts);
    setPriceEditMode(true);
  }

  function exitPriceEditMode() {
    setPriceEditMode(false);
    setPriceDrafts({});
  }

  function setPriceDraft(id: string, value: string) {
    setPriceDrafts((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSavePrices() {
    if (!isAdmin || changedPriceItems.length === 0 || hasInvalidPriceDraft) {
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase no está configurado.");
      return;
    }

    setSavingPrices(true);
    const { error } = await supabase.rpc("actualizar_precios_productos", {
      p_items: changedPriceItems,
    });
    setSavingPrices(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      changedPriceItems.length === 1
        ? "1 precio actualizado."
        : `${changedPriceItems.length} precios actualizados.`,
    );
    exitPriceEditMode();
    setLoadingList(true);
    await loadData();
  }

  function selectTab(tab: string) {
    setActiveTab(tab as ActiveTab);
    setModalOpen(false);
    setSearchQuery("");
    setCurrentProductPage(1);
    if (tab === "categorias") {
      setFilterCategoriaId(null);
      exitPriceEditMode();
    }
  }

  function goToProductosConCategoria(categoriaId: string) {
    setActiveTab("productos");
    setModalOpen(false);
    setSearchQuery("");
    setFilterCategoriaId(categoriaId);
    setCurrentProductPage(1);
  }

  function openCreateModal() {
    setFormError(null);
    setEditingProductoId(null);
    setEditingCategoriaId(null);
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

  function openEditProducto(p: ProductoListItem) {
    if (!isAdmin) return;
    setFormError(null);
    setEditingProductoId(p.id);
    setEditingCategoriaId(null);
    setNombre(p.nombre);
    setDescripcion(p.descripcion);
    setPrecio(String(p.precio_actual));
    setIdCategoria(p.id_categoria);
    setModalKind("producto");
    setModalOpen(true);
  }

  function openEditCategoria(c: CategoriaListItem) {
    if (!isAdmin) return;
    setFormError(null);
    setEditingCategoriaId(c.id);
    setEditingProductoId(null);
    setCatNombre(c.nombre);
    const sub = Boolean(c.id_padre);
    setEsSubcategoria(sub);
    setIdPadre(sub && c.id_padre ? c.id_padre : "");
    setModalKind("categoria");
    setModalOpen(true);
  }

  function closeModal(open: boolean) {
    if (open) {
      setModalOpen(true);
      return;
    }
    if (saving) return;
    setModalOpen(false);
    setEditingProductoId(null);
    setEditingCategoriaId(null);
  }

  async function performDelete() {
    if (!deleteTarget || !isAdmin || !idTienda) return;
    const supabase = createClient();
    if (!supabase) {
      toast.error("Supabase no está configurado.");
      return;
    }
    setDeleting(true);
    const now = new Date().toISOString();

    if (deleteTarget.kind === "producto") {
      const { data: softRow, error } = await supabase
        .from("productos")
        .update({ eliminado_en: now })
        .eq("id", deleteTarget.item.id)
        .eq("id_tienda", idTienda)
        .is("eliminado_en", null)
        .select("id")
        .maybeSingle();
      setDeleting(false);

      if (error || !softRow) {
        toast.error(error?.message ?? "No se pudo eliminar el producto.");
        return;
      }

      toast.success("Producto eliminado.");
      setDeleteTarget(null);
      setLoadingList(true);
      await loadData();
      return;
    }

    const treeIds = collectCategoriaTreeIds(
      deleteTarget.item.id,
      categoriasList,
    );

    const { error: prodErr } = await supabase
      .from("productos")
      .update({ eliminado_en: now })
      .eq("id_tienda", idTienda)
      .in("id_categoria", treeIds)
      .is("eliminado_en", null);

    if (prodErr) {
      setDeleting(false);
      toast.error(prodErr.message ?? "No se pudieron eliminar los productos.");
      return;
    }

    const { error: catErr } = await supabase
      .from("categorias")
      .update({ eliminado_en: now })
      .eq("id_tienda", idTienda)
      .in("id", treeIds)
      .is("eliminado_en", null);

    setDeleting(false);

    if (catErr) {
      toast.error(catErr.message ?? "No se pudo eliminar la categoría.");
      return;
    }

    toast.success("Categoría eliminada.");
    setDeleteTarget(null);
    if (
      filterCategoriaId &&
      treeIds.includes(filterCategoriaId)
    ) {
      setFilterCategoriaId(null);
    }
    setLoadingList(true);
    await loadData();
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

    const editing = editingProductoId;
    const { error } = editing
      ? await supabase
          .from("productos")
          .update({
            id_categoria: idCategoria,
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            precio_actual: precioNum,
          })
          .eq("id", editing)
          .eq("id_tienda", idTienda)
      : await supabase.from("productos").insert({
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

    toast.success(editing ? "Producto actualizado." : "Producto creado.");
    setModalOpen(false);
    setEditingProductoId(null);
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

    const editing = editingCategoriaId;
    const { error } = editing
      ? await supabase
          .from("categorias")
          .update({
            nombre: catNombre.trim(),
            id_padre: esSubcategoria && idPadre ? idPadre : null,
          })
          .eq("id", editing)
          .eq("id_tienda", idTienda)
      : await supabase.from("categorias").insert({
          id_tienda: idTienda,
          nombre: catNombre.trim(),
          id_padre: esSubcategoria && idPadre ? idPadre : null,
        });

    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    toast.success(editing ? "Categoría actualizada." : "Categoría creada.");
    setModalOpen(false);
    setEditingCategoriaId(null);
    setLoadingList(true);
    await loadData();
  }

  const nuevoLabel =
    activeTab === "productos" ? "Nuevo producto" : "Nueva categoría";

  return (
    <div className={priceEditMode ? "pb-24" : "pb-10"}>
      <PageHeader
        title="Productos"
        description="Administrá el catálogo y organizá tus categorías."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && activeTab === "productos" ? (
              priceEditMode ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={exitPriceEditMode}
                  disabled={savingPrices}
                >
                  Cancelar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={enterPriceEditMode}
                  disabled={productos.length === 0}
                >
                  <Pencil />
                  Editar precios
                </Button>
              )
            ) : null}
            {!priceEditMode ? (
              <Button onClick={openCreateModal}>
                <Plus />
                {nuevoLabel}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="space-y-6 px-6 py-6">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription role="alert">{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <Tabs value={activeTab} onValueChange={selectTab}>
          <TabsList>
            <TabsTrigger value="productos">Productos</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="productos" className="space-y-4 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:max-w-xs sm:grow">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre o descripción…"
                  autoComplete="off"
                  className="pl-9"
                  aria-label="Buscar productos"
                />
              </div>
              <Select
                value={filterCategoriaId ?? FILTRO_TODAS}
                onValueChange={(v) =>
                  setFilterCategoriaId(v === FILTRO_TODAS ? null : v)
                }
              >
                <SelectTrigger className="sm:w-56" aria-label="Filtrar por categoría">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTRO_TODAS}>
                    Todas las categorías
                  </SelectItem>
                  {categoriasList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.id_padre && c.parentNombre
                        ? `${c.nombre} · ${c.parentNombre}`
                        : c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCategoriaId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterCategoriaId(null)}
                >
                  Limpiar
                </Button>
              ) : null}
              <span className="text-body-sm text-muted-foreground sm:ml-auto">
                {productosFiltrados.length === 1
                  ? "1 producto"
                  : `${productosFiltrados.length} productos`}
              </span>
            </div>

            {loadingList ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : productos.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No hay productos todavía"
                description="Creá el primero para empezar a vender."
                action={
                  <Button onClick={openCreateModal}>
                    <Plus />
                    Nuevo producto
                  </Button>
                }
              />
            ) : productosFiltrados.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Sin resultados"
                description={
                  filterCategoriaId
                    ? searchQuery.trim()
                      ? `No hay productos en "${nombreFiltroCategoria ?? "esta categoría"}" que coincidan con "${searchQuery.trim()}".`
                      : `No hay productos en la categoría "${nombreFiltroCategoria ?? "seleccionada"}".`
                    : `No hay productos que coincidan con "${searchQuery.trim()}".`
                }
              />
            ) : (
              <>
                <DataTable>
                  <DataTableHeader>
                    <DataTableRow className="hover:bg-transparent">
                      <DataTableHead>Nombre</DataTableHead>
                      <DataTableHead>Categoría</DataTableHead>
                      <DataTableHead className="text-right">
                        Precio
                      </DataTableHead>
                      <DataTableHead className="w-12 text-right">
                        <span className="sr-only">Acciones</span>
                      </DataTableHead>
                    </DataTableRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {productosPaginados.map((p) => {
                      const draft = priceDrafts[p.id] ?? String(p.precio_actual);
                      const draftNum = parseFloat(draft.trim().replace(",", "."));
                      const priceChanged =
                        priceEditMode &&
                        Number.isFinite(draftNum) &&
                        draftNum !== p.precio_actual;
                      return (
                      <DataTableRow
                        key={p.id}
                        className={priceChanged ? "bg-amber-50/60 dark:bg-amber-950/20" : undefined}
                      >
                        <DataTableCell className="font-medium">
                          {p.nombre}
                        </DataTableCell>
                        <DataTableCell className="text-muted-foreground">
                          {p.categoriaNombre ?? "—"}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {priceEditMode ? (
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={draft}
                              onChange={(e) =>
                                setPriceDraft(p.id, e.target.value)
                              }
                              className="ml-auto h-8 w-28 text-right font-mono tabular-nums"
                              aria-label={`Precio de ${p.nombre}`}
                              disabled={savingPrices}
                            />
                          ) : (
                            <Money value={p.precio_actual} />
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {isAdmin && !priceEditMode ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={`Acciones para ${p.nombre}`}
                                >
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditProducto(p)}
                                >
                                  <Pencil />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setDeleteTarget({ kind: "producto", item: p })
                                  }
                                >
                                  <Trash2 />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}
                        </DataTableCell>
                      </DataTableRow>
                      );
                    })}
                  </DataTableBody>
                </DataTable>

                {!priceEditMode &&
                productosFiltrados.length > PRODUCTOS_POR_PAGINA ? (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentProductPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentProductPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="px-2 text-body-sm text-muted-foreground">
                      {currentProductPage} de {totalProductPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentProductPage((p) =>
                          Math.min(totalProductPages, p + 1),
                        )
                      }
                      disabled={currentProductPage === totalProductPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </TabsContent>

          <TabsContent value="categorias" className="space-y-4 pt-4">
            {loadingList ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : categoriasList.length === 0 ? (
              <EmptyState
                icon={Tag}
                title="No hay categorías todavía"
                description="Creá la primera para poder cargar productos."
                action={
                  <Button onClick={openCreateModal}>
                    <Plus />
                    Nueva categoría
                  </Button>
                }
              />
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow className="hover:bg-transparent">
                    <DataTableHead>Nombre</DataTableHead>
                    <DataTableHead>Tipo</DataTableHead>
                    <DataTableHead className="w-12 text-right">
                      <span className="sr-only">Acciones</span>
                    </DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {categoriasList.map((c) => (
                    <DataTableRow key={c.id}>
                      <DataTableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => goToProductosConCategoria(c.id)}
                          className="rounded-xs text-left hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          {c.nombre}
                        </button>
                      </DataTableCell>
                      <DataTableCell>
                        {c.id_padre && c.parentNombre ? (
                          <Badge variant="secondary">
                            Subcategoría · {c.parentNombre}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Categoría principal</Badge>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        {isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones para ${c.nombre}`}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditCategoria(c)}
                              >
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  setDeleteTarget({ kind: "categoria", item: c })
                                }
                              >
                                <Trash2 />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ProductoFormDialog
        open={modalOpen && modalKind === "producto"}
        onOpenChange={closeModal}
        editing={editingProductoId !== null}
        categoriasList={categoriasList}
        nombre={nombre}
        onNombreChange={setNombre}
        descripcion={descripcion}
        onDescripcionChange={setDescripcion}
        precio={precio}
        onPrecioChange={setPrecio}
        idCategoria={idCategoria}
        onIdCategoriaChange={setIdCategoria}
        formError={formError}
        saving={saving}
        canSubmit={canSubmitProducto}
        onSubmit={handleSubmitProducto}
      />

      <CategoriaFormDialog
        open={modalOpen && modalKind === "categoria"}
        onOpenChange={closeModal}
        editing={editingCategoriaId !== null}
        categoriasPadreDisponibles={categoriasList.filter(
          (c) => c.id !== editingCategoriaId,
        )}
        catNombre={catNombre}
        onCatNombreChange={setCatNombre}
        esSubcategoria={esSubcategoria}
        onEsSubcategoriaChange={setEsSubcategoria}
        idPadre={idPadre}
        onIdPadreChange={setIdPadre}
        formError={formError}
        saving={saving}
        canSubmit={canSubmitCategoria}
        onSubmit={handleSubmitCategoria}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title={
          deleteTarget?.kind === "producto"
            ? "Eliminar producto"
            : "Eliminar categoría"
        }
        description={
          deleteTarget ? (
            deleteTarget.kind === "producto" ? (
              <>
                ¿Eliminar el producto{" "}
                <span className="font-medium text-foreground">
                  &quot;{deleteTarget.item.nombre}&quot;
                </span>
                ? Dejará de aparecer en el catálogo y en nuevas ventas. El
                historial de ventas conservará su nombre.
              </>
            ) : (
              <>
                ¿Eliminar la categoría{" "}
                <span className="font-medium text-foreground">
                  &quot;{deleteTarget.item.nombre}&quot;
                </span>
                ?
                {deleteCategoriaProductCount > 0 ? (
                  <>
                    {" "}
                    Se eliminarán también{" "}
                    <span className="font-medium text-foreground">
                      {deleteCategoriaProductCount === 1
                        ? "1 producto"
                        : `${deleteCategoriaProductCount} productos`}
                    </span>
                    {deleteCategoriaSubCount > 0
                      ? ` y ${
                          deleteCategoriaSubCount === 1
                            ? "1 subcategoría"
                            : `${deleteCategoriaSubCount} subcategorías`
                        }`
                      : ""}
                    .
                  </>
                ) : deleteCategoriaSubCount > 0 ? (
                  <>
                    {" "}
                    Se eliminarán también{" "}
                    {deleteCategoriaSubCount === 1
                      ? "1 subcategoría"
                      : `${deleteCategoriaSubCount} subcategorías`}
                    .
                  </>
                ) : (
                  <> No tiene productos asociados.</>
                )}{" "}
                Dejarán de aparecer en el catálogo; el historial de ventas se
                conserva.
              </>
            )
          ) : null
        }
        loading={deleting}
        onConfirm={performDelete}
      />

      {priceEditMode ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-body-sm text-muted-foreground">
              {hasInvalidPriceDraft
                ? "Hay precios inválidos. Corregilos antes de guardar."
                : changedPriceItems.length === 0
                  ? "Sin cambios todavía."
                  : changedPriceItems.length === 1
                    ? "1 precio modificado"
                    : `${changedPriceItems.length} precios modificados`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={exitPriceEditMode}
                disabled={savingPrices}
              >
                Descartar
              </Button>
              <Button
                type="button"
                onClick={() => void handleSavePrices()}
                disabled={
                  savingPrices ||
                  changedPriceItems.length === 0 ||
                  hasInvalidPriceDraft
                }
              >
                {savingPrices ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

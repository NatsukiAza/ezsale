import Image from "next/image";
import { catalogProducts } from "@/data";
import { TopAppBar } from "./top-app-bar";

export function ProductsView() {
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
          <div className="relative flex-grow">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input
              className="w-full rounded-xl border-none bg-surface-container-low py-3 pr-4 pl-11 transition-all focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30"
              placeholder="Buscar por nombre o SKU..."
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
            className="border-b-2 border-primary pb-4 font-bold text-primary transition-all"
          >
            Productos
          </button>
          <button
            type="button"
            className="pb-4 font-medium text-on-surface-variant transition-all hover:text-on-surface"
          >
            Categorías
          </button>
          <button
            type="button"
            className="pb-4 font-medium text-on-surface-variant transition-all hover:text-on-surface"
          >
            Subcategorías
          </button>
        </div>

        <div className="space-y-3">
          {catalogProducts.map((p) => (
            <div
              key={p.id}
              className="group flex items-center justify-between rounded-2xl border border-transparent bg-surface-container-lowest p-4 transition-all duration-300 hover:border-surface-container-high hover:bg-white hover:shadow-xl hover:shadow-on-surface/5"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-surface-container-high">
                  <Image
                    src={p.img}
                    alt={p.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">{p.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-md bg-secondary-container px-2 py-0.5 font-label text-xs tracking-widest text-on-secondary-container uppercase">
                      {p.cat}
                    </span>
                    <span className="text-xs font-medium text-on-surface-variant">
                      SKU: {p.sku}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="font-label text-xs tracking-widest text-outline uppercase">
                    Precio
                  </p>
                  <p className="text-xl font-bold text-primary">{p.price}</p>
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
          ))}
        </div>
      </main>
      <button
        type="button"
        className="group fixed right-6 bottom-8 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-2xl transition-transform duration-150 active:scale-95"
        aria-label="Agregar nuevo producto"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <div className="pointer-events-none absolute right-full mr-4 rounded-lg bg-inverse-surface px-4 py-2 text-sm whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100">
          Agregar Nuevo Producto
        </div>
      </button>
    </div>
  );
}

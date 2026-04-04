import Image from "next/image";
import { teamMembers } from "@/data";
import { TopAppBar } from "./top-app-bar";

export function TeamView() {
  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref="/team" />
      <main className="mx-auto max-w-5xl px-6 pt-28">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-1">
            <p className="font-label text-[10px] font-medium tracking-widest text-outline uppercase">
              Gestión Administrativa
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Usuarios</h2>
          </div>
          <button
            type="button"
            className="pill-gradient flex items-center gap-2 rounded-full px-8 py-3.5 font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">person_add</span>
            <span>Agregar Usuario</span>
          </button>
        </section>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <p className="font-label mb-1 text-sm tracking-wider text-outline uppercase">
              Total Miembros
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold">12</span>
              <span className="text-xs font-medium text-secondary">+2 este mes</span>
            </div>
          </div>
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <p className="font-label mb-1 text-sm tracking-wider text-outline uppercase">
              Administradores
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-primary">3</span>
              <span className="text-xs text-outline">Acceso total</span>
            </div>
          </div>
          <div className="rounded-3xl bg-secondary-container p-6 shadow-sm">
            <p className="font-label mb-1 text-sm tracking-wider text-on-secondary-container uppercase">
              Personal Activo
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-on-secondary-container">
                9
              </span>
              <span className="text-xs text-on-secondary-container/70">En turno ahora</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-surface-container-low p-4 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 px-2 sm:flex-row sm:items-center">
            <h3 className="font-headline text-xl font-bold">Directorio del Equipo</h3>
            <div className="flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
              <span className="material-symbols-outlined text-sm text-outline">search</span>
              <input
                className="w-full border-none bg-transparent text-sm placeholder:text-outline-variant focus:ring-0 sm:w-64"
                placeholder="Buscar por nombre..."
                type="search"
                name="team-search"
              />
            </div>
          </div>

          <div className="space-y-3">
            {teamMembers.map((user) => (
              <div
                key={user.email}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-stone-100 bg-surface-container-lowest p-5 transition-shadow hover:shadow-md md:flex-row md:items-center"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
                    <Image
                      src={user.img}
                      alt={user.name}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{user.name}</p>
                    <p className="text-sm text-outline">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-8 md:justify-end">
                  <div
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase ${
                      user.role === "Admin"
                        ? "bg-primary-container/20 text-on-primary-container"
                        : "bg-secondary-container text-on-secondary-container"
                    }`}
                  >
                    {user.active ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                    ) : null}
                    {user.role}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-high active:scale-95"
                      aria-label="Editar"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button
                      type="button"
                      className="rounded-full p-2 text-outline transition-colors hover:bg-error-container/10 hover:text-error active:scale-95"
                      aria-label="Eliminar"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-outline transition-colors hover:bg-surface-container-high"
              aria-label="Página anterior"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex gap-2">
              <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary">
                1
              </span>
              <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm text-outline transition-colors hover:bg-surface-container">
                2
              </span>
              <span className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-sm text-outline transition-colors hover:bg-surface-container">
                3
              </span>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-outline transition-colors hover:bg-surface-container-high"
              aria-label="Página siguiente"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopAppBar } from "./top-app-bar";

type MiembroRow = {
  id: string;
  nombre: string;
  apellido: string;
  rol: "admin" | "normal";
};

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function iniciales(nombre: string, apellido: string) {
  const a = nombre.trim().charAt(0) || "";
  const b = apellido.trim().charAt(0) || "";
  const s = (a + b).toUpperCase();
  return s || "?";
}

export function TeamView() {
  const [miembros, setMiembros] = useState<MiembroRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [soyAdmin, setSoyAdmin] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNombre, setInviteNombre] = useState("");
  const [inviteApellido, setInviteApellido] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteEsAdmin, setInviteEsAdmin] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editNombre, setEditNombre] = useState("");
  const [editApellido, setEditApellido] = useState("");
  const [editEsAdmin, setEditEsAdmin] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFetchFailed, setEditFetchFailed] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editLoadingInitial, setEditLoadingInitial] = useState(false);

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  const load = useCallback(async () => {
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
      setLoadError("Iniciá sesión para ver el equipo.");
      setCurrentUserId(null);
      setSoyAdmin(false);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: perfil, error: pe } = await supabase
      .from("perfiles")
      .select("id_tienda, rol")
      .eq("id", user.id)
      .maybeSingle();

    if (pe || !perfil?.id_tienda) {
      setLoadError(pe?.message ?? "No se encontró tu tienda.");
      setSoyAdmin(false);
      setLoading(false);
      return;
    }

    setSoyAdmin(perfil.rol === "admin");
    const tid = perfil.id_tienda as string;
    const { data: rows, error: re } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido, rol")
      .eq("id_tienda", tid);

    if (re) {
      setLoadError(re.message);
      setMiembros([]);
      setLoading(false);
      return;
    }

    const list = (rows ?? []) as MiembroRow[];
    const me = list.find((m) => m.id === user.id);
    const rest = list
      .filter((m) => m.id !== user.id)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    setMiembros(me ? [me, ...rest] : rest);
    setLoadError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalMiembros = miembros.length;
  const totalAdmins = useMemo(
    () => miembros.filter((m) => m.rol === "admin").length,
    [miembros],
  );

  const filtrados = useMemo(() => {
    const q = searchFold(query.trim());
    const base = q
      ? miembros.filter((m) => {
          const full = searchFold(`${m.nombre} ${m.apellido}`);
          return full.includes(q);
        })
      : miembros;
    if (!currentUserId) return base;
    const me = base.find((m) => m.id === currentUserId);
    const rest = base
      .filter((m) => m.id !== currentUserId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return me ? [me, ...rest] : rest;
  }, [miembros, query, currentUserId]);

  function closeInviteModal() {
    setInviteModalOpen(false);
    setInviteError(null);
    setInviteEmail("");
    setInviteNombre("");
    setInviteApellido("");
    setInvitePassword("");
    setInviteEsAdmin(false);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditMemberId(null);
    setEditEmail("");
    setEditNombre("");
    setEditApellido("");
    setEditEsAdmin(false);
    setEditError(null);
    setEditFetchFailed(false);
    setEditLoadingInitial(false);
  }

  async function openEditModal(memberId: string) {
    setEditMemberId(memberId);
    setEditModalOpen(true);
    setEditError(null);
    setEditFetchFailed(false);
    setEditLoadingInitial(true);
    const res = await fetch(`/api/team/members/${memberId}`);
    const json = (await res.json()) as {
      ok?: boolean;
      email?: string;
      nombre?: string;
      apellido?: string;
      esAdmin?: boolean;
      error?: string;
    };
    setEditLoadingInitial(false);
    if (!res.ok || !json.ok) {
      setEditFetchFailed(true);
      setEditError(json.error ?? "No se pudieron cargar los datos.");
      return;
    }
    setEditEmail(json.email ?? "");
    setEditNombre(json.nombre ?? "");
    setEditApellido(json.apellido ?? "");
    setEditEsAdmin(json.esAdmin === true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMemberId || !editNombre.trim()) {
      setEditError("El nombre es obligatorio.");
      return;
    }
    setEditError(null);
    setEditLoading(true);
    const res = await fetch(`/api/team/members/${editMemberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        esAdmin: editEsAdmin,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setEditLoading(false);
    if (!res.ok || !json.ok) {
      setEditError(json.error ?? "No se pudo guardar.");
      return;
    }
    closeEditModal();
    void load();
  }

  async function handleDeleteMember(memberId: string, nombreCompleto: string) {
    const ok = window.confirm(
      `¿Eliminar a ${nombreCompleto}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      window.alert(json.error ?? "No se pudo eliminar.");
      return;
    }
    void load();
  }

  function closePwdModal() {
    setPwdModalOpen(false);
    setPwdNew("");
    setPwdConfirm("");
    setPwdError(null);
  }

  async function handlePwdSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwdNew.length < 6) {
      setPwdError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError("Las contraseñas no coinciden.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setPwdError("Supabase no está configurado.");
      return;
    }
    setPwdLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPwdLoading(false);
      setPwdError("Sesión no válida.");
      return;
    }
    const { error: updAuth } = await supabase.auth.updateUser({ password: pwdNew });
    if (updAuth) {
      setPwdLoading(false);
      setPwdError(mapAuthErrorMessage(updAuth.message));
      return;
    }
    await supabase
      .from("perfiles")
      .update({ debe_cambiar_password: false })
      .eq("id", user.id);
    setPwdLoading(false);
    closePwdModal();
    void load();
  }

  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim() || !inviteNombre.trim() || !invitePassword) {
      setInviteError("Completá correo, nombre y contraseña.");
      return;
    }
    if (invitePassword.length < 6) {
      setInviteError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setInviteLoading(true);
    const res = await fetch("/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        password: invitePassword,
        nombre: inviteNombre.trim(),
        apellido: inviteApellido.trim(),
        esAdmin: inviteEsAdmin,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setInviteLoading(false);

    if (!res.ok || !json.ok) {
      setInviteError(json.error ?? "No se pudo crear el usuario.");
      return;
    }

    closeInviteModal();
    void load();
  }

  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref="/team" />
      <main className="mx-auto max-w-5xl px-6 pt-28">
        <section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-1">
            <p className="font-label text-[10px] font-medium tracking-widest text-outline uppercase">
              Gestión Administrativa
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">
              Usuarios
            </h2>
          </div>
          {soyAdmin ? (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="pill-gradient flex items-center gap-2 rounded-full px-8 py-3.5 font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined">person_add</span>
              <span>Agregar usuario</span>
            </button>
          ) : null}
        </section>

        {loadError ? (
          <p
            className="mb-8 rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <p className="font-label mb-1 text-sm tracking-wider text-outline uppercase">
              Total miembros
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold">
                {loading ? "…" : totalMiembros}
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-sm">
            <p className="font-label mb-1 text-sm tracking-wider text-outline uppercase">
              Administradores
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-primary">
                {loading ? "…" : totalAdmins}
              </span>
              <span className="text-xs text-outline">Rol admin</span>
            </div>
          </div>
        </div>

        <div className="rounded-4xl bg-surface-container-low p-4 md:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 px-2 sm:flex-row sm:items-center">
            <h3 className="font-headline text-xl font-bold">Directorio del equipo</h3>
            <div className="flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2">
              <span className="material-symbols-outlined text-sm text-outline">
                search
              </span>
              <input
                className="w-full min-w-0 border-none bg-transparent text-sm placeholder:text-outline-variant focus:ring-0 sm:w-64"
                placeholder="Buscar por nombre…"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar por nombre"
              />
            </div>
          </div>

          {loading ? (
            <p className="px-2 text-on-surface-variant">Cargando equipo…</p>
          ) : filtrados.length === 0 ? (
            <p className="px-2 text-on-surface-variant">
              {miembros.length === 0
                ? "No hay miembros en tu tienda."
                : "Ningún miembro coincide con la búsqueda."}
            </p>
          ) : (
            <div className="space-y-3">
              {filtrados.map((m) => {
                const nombreCompleto =
                  `${m.nombre} ${m.apellido}`.trim() || "Sin nombre";
                const esAdminMiembro = m.rol === "admin";
                const esYo = m.id === currentUserId;
                const esUnicoAdmin = esAdminMiembro && totalAdmins === 1;
                const puedeEliminar = soyAdmin && !esUnicoAdmin;
                return (
                  <div
                    key={m.id}
                    className="group flex flex-col justify-between gap-4 rounded-2xl border border-stone-100 bg-surface-container-lowest p-5 transition-shadow hover:shadow-md md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-primary-container/30 font-headline text-sm font-bold text-on-primary-container">
                        {iniciales(m.nombre, m.apellido)}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface">{nombreCompleto}</p>
                        {esYo ? (
                          <p className="text-xs font-medium text-primary">Vos</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-8 md:justify-end">
                      <div
                        className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider uppercase ${
                          esAdminMiembro
                            ? "bg-primary-container/20 text-on-primary-container"
                            : "bg-secondary-container text-on-secondary-container"
                        }`}
                      >
                        {esAdminMiembro ? "Admin" : "Normal"}
                      </div>
                      <div className="flex items-center gap-1">
                        {esYo ? (
                          <button
                            type="button"
                            onClick={() => setPwdModalOpen(true)}
                            className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-high active:scale-95"
                            aria-label="Cambiar contraseña"
                            title="Cambiar contraseña"
                          >
                            <span className="material-symbols-outlined">lock_reset</span>
                          </button>
                        ) : null}
                        {soyAdmin ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void openEditModal(m.id)}
                              className="rounded-full p-2 text-outline transition-colors hover:bg-surface-container-high active:scale-95"
                              aria-label={`Editar ${nombreCompleto}`}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            {puedeEliminar ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteMember(m.id, nombreCompleto)}
                                className="rounded-full p-2 text-outline transition-colors hover:bg-error-container/10 hover:text-error active:scale-95"
                                aria-label={`Eliminar ${nombreCompleto}`}
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {inviteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar"
            onClick={closeInviteModal}
          />
          <div
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-4xl border border-stone-200/80 bg-surface-container-lowest p-8 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="invite-user-title"
                  className="font-headline text-2xl font-extrabold text-on-surface"
                >
                  Invitar usuario
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Se creará una cuenta con acceso a esta tienda. El correo debe ser único.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInviteModal}
                className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => void handleInviteSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="invite-email">
                  Correo electrónico *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="invite-nombre">
                    Nombre *
                  </label>
                  <input
                    id="invite-nombre"
                    required
                    value={inviteNombre}
                    onChange={(e) => setInviteNombre(e.target.value)}
                    className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="invite-apellido">
                    Apellido
                  </label>
                  <input
                    id="invite-apellido"
                    value={inviteApellido}
                    onChange={(e) => setInviteApellido(e.target.value)}
                    className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="invite-password">
                  Contraseña temporal *
                </label>
                <input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  Al iniciar sesión por primera vez se pedirá una nueva contraseña; esta sirve
                  solo para el primer acceso.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-stone-300 text-primary focus:ring-primary/40"
                  checked={inviteEsAdmin}
                  onChange={(e) => setInviteEsAdmin(e.target.checked)}
                />
                <span className="text-sm text-on-surface">
                  También es administrador de la tienda
                </span>
              </label>

              {inviteError ? (
                <p
                  className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                  role="alert"
                >
                  {inviteError}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeInviteModal}
                  className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:opacity-60"
                >
                  {inviteLoading ? "Creando…" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar"
            onClick={closeEditModal}
          />
          <div
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-4xl border border-stone-200/80 bg-surface-container-lowest p-8 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="edit-user-title"
                  className="font-headline text-2xl font-extrabold text-on-surface"
                >
                  Editar usuario
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  El correo no se puede cambiar desde aquí.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {editLoadingInitial ? (
              <p className="text-on-surface-variant">Cargando datos…</p>
            ) : editFetchFailed ? (
              <div className="space-y-4">
                <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error" role="alert">
                  {editError}
                </p>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="w-full rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="edit-email">
                    Correo electrónico
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    readOnly
                    value={editEmail}
                    className="w-full cursor-not-allowed rounded-xl border-none bg-surface-container-high/80 px-4 py-3 text-on-surface-variant outline-none ring-1 ring-stone-200/60"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="edit-nombre">
                      Nombre *
                    </label>
                    <input
                      id="edit-nombre"
                      required
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="edit-apellido">
                      Apellido
                    </label>
                    <input
                      id="edit-apellido"
                      value={editApellido}
                      onChange={(e) => setEditApellido(e.target.value)}
                      className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 rounded border-stone-300 text-primary focus:ring-primary/40 disabled:opacity-60"
                    checked={editEsAdmin}
                    disabled={totalAdmins === 1 && editEsAdmin}
                    onChange={(e) => setEditEsAdmin(e.target.checked)}
                  />
                  <span className="text-sm text-on-surface">
                    Administrador de la tienda
                    {totalAdmins === 1 && editEsAdmin ? (
                      <span className="mt-1 block text-xs text-on-surface-variant">
                        No podés quitar el único administrador mientras sea el único.
                      </span>
                    ) : null}
                  </span>
                </label>

                {editError ? (
                  <p
                    className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                    role="alert"
                  >
                    {editError}
                  </p>
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || editLoadingInitial}
                    className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:opacity-60"
                  >
                    {editLoading ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {pwdModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar"
            onClick={closePwdModal}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-4xl border border-stone-200/80 bg-surface-container-lowest p-8 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="pwd-modal-title"
                  className="font-headline text-2xl font-extrabold text-on-surface"
                >
                  Cambiar contraseña
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Elegí una contraseña segura para tu cuenta.
                </p>
              </div>
              <button
                type="button"
                onClick={closePwdModal}
                className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={(e) => void handlePwdSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pwd-new">
                  Nueva contraseña
                </label>
                <input
                  id="pwd-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                  className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="pwd-confirm">
                  Confirmar contraseña
                </label>
                <input
                  id="pwd-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                  className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {pwdError ? (
                <p
                  className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                  role="alert"
                >
                  {pwdError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePwdModal}
                  className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:opacity-60"
                >
                  {pwdLoading ? "Guardando…" : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

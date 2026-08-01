"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { clearGateCookieClient } from "@/lib/supabase/gate-cookie";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { FormField } from "@/components/app/form-field";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function TeamView({
  idTienda,
  currentUserId,
  initialMiembros,
  initialLoadError = null,
}: {
  idTienda: string;
  currentUserId: string;
  initialMiembros: MiembroRow[];
  initialLoadError?: string | null;
}) {
  const [miembros, setMiembros] = useState<MiembroRow[]>(initialMiembros);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const soyAdmin = true;

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

  const [deleteTarget, setDeleteTarget] = useState<MiembroRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoadError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    setLoading(true);
    const tid = idTienda;
    const { data: rows, error: re } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido, rol")
      .eq("id_tienda", tid)
      .is("eliminado_en", null);

    if (re) {
      setLoadError(re.message);
      setMiembros([]);
      setLoading(false);
      return;
    }

    const list = (rows ?? []) as MiembroRow[];
    const me = list.find((m) => m.id === currentUserId);
    const rest = list
      .filter((m) => m.id !== currentUserId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    setMiembros(me ? [me, ...rest] : rest);
    setLoadError(null);
    setLoading(false);
  }, [idTienda, currentUserId]);

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
    const me = base.find((m) => m.id === currentUserId);
    const rest = base
      .filter((m) => m.id !== currentUserId)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return me ? [me, ...rest] : rest;
  }, [miembros, query, currentUserId]);

  function closeInviteModal() {
    if (inviteLoading) return;
    setInviteModalOpen(false);
    setInviteError(null);
    setInviteEmail("");
    setInviteNombre("");
    setInviteApellido("");
    setInvitePassword("");
    setInviteEsAdmin(false);
  }

  function closeEditModal() {
    if (editLoading) return;
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
    toast.success("Usuario actualizado.");
    closeEditModal();
    void load();
  }

  async function performDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/team/members/${deleteTarget.id}`, {
      method: "DELETE",
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setDeleting(false);
    if (!res.ok || !json.ok) {
      toast.error(json.error ?? "No se pudo eliminar.");
      return;
    }
    toast.success("Miembro eliminado.");
    setDeleteTarget(null);
    void load();
  }

  function closePwdModal() {
    if (pwdLoading) return;
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
    const { error: updAuth } = await supabase.auth.updateUser({
      password: pwdNew,
    });
    if (updAuth) {
      setPwdLoading(false);
      setPwdError(mapAuthErrorMessage(updAuth.message));
      return;
    }
    await supabase
      .from("perfiles")
      .update({ debe_cambiar_password: false })
      .eq("id", user.id);
    clearGateCookieClient();
    setPwdLoading(false);
    toast.success("Contraseña actualizada.");
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

    toast.success("Usuario creado.");
    closeInviteModal();
    void load();
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Equipo"
        description="Gestioná los usuarios con acceso a tu tienda."
        actions={
          soyAdmin ? (
            <Button onClick={() => setInviteModalOpen(true)}>
              <UserPlus />
              Invitar
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4 px-6 py-6">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            autoComplete="off"
            className="pl-9"
            aria-label="Buscar por nombre"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filtrados.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              miembros.length === 0
                ? "No hay miembros en tu tienda"
                : "Ningún miembro coincide"
            }
            description={
              miembros.length === 0
                ? "Invitá al primer miembro de tu equipo."
                : "Probá con otro nombre."
            }
          />
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead>Nombre</DataTableHead>
                <DataTableHead>Rol</DataTableHead>
                <DataTableHead className="w-12 text-right">
                  <span className="sr-only">Acciones</span>
                </DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {filtrados.map((m) => {
                const nombreCompleto =
                  `${m.nombre} ${m.apellido}`.trim() || "Sin nombre";
                const esAdminMiembro = m.rol === "admin";
                const esYo = m.id === currentUserId;
                const esUnicoAdmin = esAdminMiembro && totalAdmins === 1;
                const puedeEliminar = soyAdmin && !esUnicoAdmin;
                const showMenu = soyAdmin || esYo;
                return (
                  <DataTableRow key={m.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-3">
                        <Avatar size="sm">
                          <AvatarFallback>
                            {iniciales(m.nombre, m.apellido)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {nombreCompleto}
                          </p>
                          {esYo ? (
                            <p className="text-caption text-primary">Vos</p>
                          ) : null}
                        </div>
                      </div>
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={esAdminMiembro ? "admin" : "normal"}>
                        {esAdminMiembro ? "Admin" : "Normal"}
                      </StatusBadge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      {showMenu ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Acciones para ${nombreCompleto}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {esYo ? (
                              <DropdownMenuItem
                                onClick={() => setPwdModalOpen(true)}
                              >
                                <KeyRound />
                                Cambiar contraseña
                              </DropdownMenuItem>
                            ) : null}
                            {soyAdmin ? (
                              <DropdownMenuItem
                                onClick={() => void openEditModal(m.id)}
                              >
                                <Pencil />
                                Editar
                              </DropdownMenuItem>
                            ) : null}
                            {soyAdmin && puedeEliminar ? (
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(m)}
                              >
                                <Trash2 />
                                Eliminar
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </div>

      <Dialog
        open={inviteModalOpen}
        onOpenChange={(open) => {
          if (!open) closeInviteModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
            <DialogDescription>
              Se creará una cuenta con acceso a esta tienda. El correo debe
              ser único.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handleInviteSubmit(e)} className="space-y-4">
            <FormField id="invite-email" label="Correo electrónico *">
              <Input
                id="invite-email"
                type="email"
                required
                autoComplete="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="invite-nombre" label="Nombre *">
                <Input
                  id="invite-nombre"
                  required
                  value={inviteNombre}
                  onChange={(e) => setInviteNombre(e.target.value)}
                />
              </FormField>
              <FormField id="invite-apellido" label="Apellido">
                <Input
                  id="invite-apellido"
                  value={inviteApellido}
                  onChange={(e) => setInviteApellido(e.target.value)}
                />
              </FormField>
            </div>

            <FormField
              id="invite-password"
              label="Contraseña temporal *"
              hint="Al iniciar sesión por primera vez se pedirá una nueva contraseña; esta sirve solo para el primer acceso."
            >
              <Input
                id="invite-password"
                type="password"
                autoComplete="new-password"
                required
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
            </FormField>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2.5">
              <Checkbox
                checked={inviteEsAdmin}
                onCheckedChange={(c) => setInviteEsAdmin(c === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                También es administrador de la tienda
              </span>
            </label>

            {inviteError ? (
              <Alert variant="destructive">
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closeInviteModal}
                disabled={inviteLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteLoading}>
                {inviteLoading ? (
                  <Loader2 className="animate-spin" />
                ) : null}
                {inviteLoading ? "Creando…" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              El correo no se puede cambiar desde aquí.
            </DialogDescription>
          </DialogHeader>

          {editLoadingInitial ? (
            <div className="space-y-3 py-1">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : editFetchFailed ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
              <Button type="button" className="w-full" onClick={closeEditModal}>
                Cerrar
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
              <FormField id="edit-email" label="Correo electrónico">
                <Input id="edit-email" type="email" readOnly disabled value={editEmail} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="edit-nombre" label="Nombre *">
                  <Input
                    id="edit-nombre"
                    required
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                </FormField>
                <FormField id="edit-apellido" label="Apellido">
                  <Input
                    id="edit-apellido"
                    value={editApellido}
                    onChange={(e) => setEditApellido(e.target.value)}
                  />
                </FormField>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2.5">
                <Checkbox
                  checked={editEsAdmin}
                  disabled={totalAdmins === 1 && editEsAdmin}
                  onCheckedChange={(c) => setEditEsAdmin(c === true)}
                  className="mt-0.5"
                />
                <span className="text-sm">
                  Administrador de la tienda
                  {totalAdmins === 1 && editEsAdmin ? (
                    <span className="mt-1 block text-caption text-muted-foreground">
                      No podés quitar el único administrador mientras sea el
                      único.
                    </span>
                  ) : null}
                </span>
              </label>

              {editError ? (
                <Alert variant="destructive">
                  <AlertDescription>{editError}</AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeEditModal}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? <Loader2 className="animate-spin" /> : null}
                  {editLoading ? "Guardando…" : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={pwdModalOpen}
        onOpenChange={(open) => {
          if (!open) closePwdModal();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Elegí una contraseña segura para tu cuenta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => void handlePwdSubmit(e)} className="space-y-4">
            <FormField id="pwd-new" label="Nueva contraseña">
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                required
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
              />
            </FormField>
            <FormField id="pwd-confirm" label="Confirmar contraseña">
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
              />
            </FormField>

            {pwdError ? (
              <Alert variant="destructive">
                <AlertDescription>{pwdError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={closePwdModal}
                disabled={pwdLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pwdLoading}>
                {pwdLoading ? <Loader2 className="animate-spin" /> : null}
                {pwdLoading ? "Guardando…" : "Actualizar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        title="Eliminar miembro"
        description={
          deleteTarget ? (
            <>
              ¿Eliminar a{" "}
              <span className="font-medium text-foreground">
                {`${deleteTarget.nombre} ${deleteTarget.apellido}`.trim() ||
                  "este miembro"}
              </span>
              ? Dejará de aparecer en el equipo y no podrá iniciar sesión. Sus
              ventas seguirán mostrando su nombre.
            </>
          ) : null
        }
        loading={deleting}
        onConfirm={performDelete}
      />
    </div>
  );
}

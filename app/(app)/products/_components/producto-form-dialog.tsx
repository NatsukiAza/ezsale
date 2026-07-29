"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/app/form-field";

export type CategoriaOption = {
  id: string;
  nombre: string;
};

type ProductoFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  categoriasList: CategoriaOption[];
  nombre: string;
  onNombreChange: (value: string) => void;
  descripcion: string;
  onDescripcionChange: (value: string) => void;
  precio: string;
  onPrecioChange: (value: string) => void;
  idCategoria: string;
  onIdCategoriaChange: (value: string) => void;
  formError: string | null;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function ProductoFormDialog({
  open,
  onOpenChange,
  editing,
  categoriasList,
  nombre,
  onNombreChange,
  descripcion,
  onDescripcionChange,
  precio,
  onPrecioChange,
  idCategoria,
  onIdCategoriaChange,
  formError,
  saving,
  canSubmit,
  onSubmit,
}: ProductoFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Modificá los datos y guardá los cambios."
              : "Completá todos los campos para guardar en tu tienda."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField id="prod-nombre" label="Nombre *">
            <Input
              id="prod-nombre"
              required
              value={nombre}
              onChange={(e) => onNombreChange(e.target.value)}
              placeholder="Ej. Hamburguesa clásica"
              autoComplete="off"
            />
          </FormField>

          <FormField id="prod-desc" label="Descripción *">
            <Textarea
              id="prod-desc"
              required
              rows={3}
              value={descripcion}
              onChange={(e) => onDescripcionChange(e.target.value)}
              placeholder="Ingredientes, presentación, etc."
            />
          </FormField>

          <FormField id="prod-precio" label="Precio *">
            <Input
              id="prod-precio"
              type="text"
              inputMode="decimal"
              value={precio}
              onChange={(e) => onPrecioChange(e.target.value)}
              placeholder="0.00"
              autoComplete="off"
            />
          </FormField>

          <FormField
            id="prod-cat"
            label="Categoría *"
            hint={
              categoriasList.length === 0
                ? "Primero creá al menos una categoría en la pestaña Categorías."
                : undefined
            }
          >
            <Select value={idCategoria} onValueChange={onIdCategoriaChange}>
              <SelectTrigger id="prod-cat" className="w-full">
                <SelectValue placeholder="Seleccioná una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoriasList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription role="alert">{formError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Guardar producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

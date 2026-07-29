"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

export type CategoriaPadreOption = {
  id: string;
  nombre: string;
};

type CategoriaFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  categoriasPadreDisponibles: CategoriaPadreOption[];
  catNombre: string;
  onCatNombreChange: (value: string) => void;
  esSubcategoria: boolean;
  onEsSubcategoriaChange: (value: boolean) => void;
  idPadre: string;
  onIdPadreChange: (value: string) => void;
  formError: string | null;
  saving: boolean;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function CategoriaFormDialog({
  open,
  onOpenChange,
  editing,
  categoriasPadreDisponibles,
  catNombre,
  onCatNombreChange,
  esSubcategoria,
  onEsSubcategoriaChange,
  idPadre,
  onIdPadreChange,
  formError,
  saving,
  canSubmit,
  onSubmit,
}: CategoriaFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualizá el nombre o la jerarquía y guardá."
              : "Nombre obligatorio. Marcá si es subcategoría y elegí la categoría padre."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <FormField id="cat-nombre" label="Nombre *">
            <Input
              id="cat-nombre"
              required
              value={catNombre}
              onChange={(e) => onCatNombreChange(e.target.value)}
              placeholder="Ej. Bebidas"
              autoComplete="off"
            />
          </FormField>

          <label
            htmlFor="cat-es-subcategoria"
            className="flex cursor-pointer items-center gap-2.5 rounded-md border border-input bg-card px-3 py-2.5"
          >
            <Checkbox
              id="cat-es-subcategoria"
              checked={esSubcategoria}
              onCheckedChange={(checked) => {
                const on = checked === true;
                onEsSubcategoriaChange(on);
                if (!on) onIdPadreChange("");
              }}
            />
            <Label htmlFor="cat-es-subcategoria" className="text-sm font-normal">
              Es subcategoría
            </Label>
          </label>

          {esSubcategoria ? (
            <FormField
              id="cat-padre"
              label="Categoría padre *"
              hint={
                categoriasPadreDisponibles.length === 0
                  ? 'Creá primero una categoría principal sin marcar "Es subcategoría".'
                  : undefined
              }
            >
              <Select
                value={idPadre}
                onValueChange={onIdPadreChange}
                disabled={categoriasPadreDisponibles.length === 0}
              >
                <SelectTrigger id="cat-padre" className="w-full">
                  <SelectValue placeholder="Seleccioná la categoría padre" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasPadreDisponibles.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

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
                  : "Guardar categoría"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

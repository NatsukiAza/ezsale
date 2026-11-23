import { PageHeader } from "@/components/app/page-header";
import { AmbientBackgroundSetting } from "./_components/ambient-background-setting";

export default function ConfiguracionPage() {
  return (
    <div className="pb-10">
      <PageHeader
        title="Configuración"
        description="Cómo se ve Toque en esta pantalla. Queda guardado en este navegador."
      />
      <div className="px-6 py-6">
        <section className="max-w-2xl rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-h2">Apariencia</h2>
            <p className="mt-1 text-body-sm text-muted-foreground">
              Solo cambia esta pantalla. No afecta al resto del equipo.
            </p>
          </div>
          <AmbientBackgroundSetting />
        </section>
      </div>
    </div>
  );
}

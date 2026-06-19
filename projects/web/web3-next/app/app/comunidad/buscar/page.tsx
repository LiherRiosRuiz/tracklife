import { Card, PageHeader } from "@/components/ui";

export default function BuscarPage() {
  return (
    <div>
      <PageHeader title="Buscar" subtitle="Personas, clubs y retos" />
      <Card>
        <input
          placeholder="Buscar en la comunidad..."
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="mt-3 text-sm text-muted">Búsqueda avanzada próximamente.</p>
      </Card>
    </div>
  );
}

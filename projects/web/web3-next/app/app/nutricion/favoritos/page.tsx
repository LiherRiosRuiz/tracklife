import { Card, PageHeader } from "@/components/ui";

export default function FavoritosPage() {
  return (
    <div>
      <PageHeader title="Favoritos" subtitle="Productos y recetas guardados" />
      <Card>
        <p className="text-sm text-muted">
          Marca productos desde el escáner o recetas para verlos aquí.
        </p>
      </Card>
    </div>
  );
}

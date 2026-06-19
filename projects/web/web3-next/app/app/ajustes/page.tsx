import { Card, PageHeader } from "@/components/ui";

export default function AjustesPage() {
  return (
    <div>
      <PageHeader title="Ajustes" />
      <Card>
        <h3 className="font-semibold">Privacidad</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>Comidas: seguidores</li>
          <li>Escaneos: público</li>
          <li>Biométricos: privado</li>
          <li>Entrenamientos: seguidores</li>
        </ul>
      </Card>
    </div>
  );
}

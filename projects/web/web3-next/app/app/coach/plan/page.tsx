import { Card, PageHeader } from "@/components/ui";

export default function CoachPlanPage() {
  return (
    <div>
      <PageHeader title="Plan integrado" subtitle="Entreno + nutrición basado en tus datos" />
      <Card>
        <h3 className="font-semibold">Hoy</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          <li>• Objetivo calórico: mantener déficit moderado</li>
          <li>• Entrenamiento sugerido: fuerza tren inferior</li>
          <li>• Recuperación: priorizar 8h de sueño</li>
        </ul>
      </Card>
    </div>
  );
}

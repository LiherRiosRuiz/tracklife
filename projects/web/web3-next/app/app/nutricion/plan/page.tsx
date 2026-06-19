import { Card, PageHeader } from "@/components/ui";

const plan = [
  { day: "Lunes", meals: "Pollo + arroz + ensalada" },
  { day: "Martes", meals: "Salmón + quinoa + verduras" },
  { day: "Miércoles", meals: "Pavo + patata + brócoli" },
  { day: "Jueves", meals: "Huevos + avena + fruta" },
  { day: "Viernes", meals: "Atún + pasta integral" },
  { day: "Sábado", meals: "Libre controlado" },
  { day: "Domingo", meals: "Meal prep semanal" },
];

export default function PlanPage() {
  return (
    <div>
      <PageHeader title="Plan nutricional" subtitle="Plantilla semanal — personalizable próximamente" />
      <div className="space-y-3">
        {plan.map((d) => (
          <Card key={d.day}>
            <h3 className="font-semibold">{d.day}</h3>
            <p className="mt-1 text-sm text-muted">{d.meals}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

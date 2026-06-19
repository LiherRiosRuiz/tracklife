import { Button, Card, PageHeader } from "@/components/ui";

const links = [
  { href: "/app/entrenamiento/gym", title: "Gym", desc: "Log de fuerza estilo Hevi" },
  { href: "/app/entrenamiento/planes", title: "Planes", desc: "Rutinas de entrenamiento" },
  { href: "/app/entrenamiento/gym/ejercicios", title: "Ejercicios", desc: "Biblioteca" },
  { href: "/app/entrenamiento/cardio", title: "Cardio", desc: "Actividades estilo Strava" },
  { href: "/app/entrenamiento/calendario", title: "Calendario", desc: "Vista semanal" },
  { href: "/app/entrenamiento/progreso", title: "Progreso", desc: "PRs y volumen" },
];

export default function EntrenamientoHubPage() {
  return (
    <div>
      <PageHeader title="Entrenamiento" subtitle="Fuerza y cardio con seguimiento" />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Card key={l.href}>
            <h3 className="font-semibold">{l.title}</h3>
            <p className="mt-1 text-sm text-muted">{l.desc}</p>
            <Button href={l.href} className="mt-3" variant="secondary">Abrir</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

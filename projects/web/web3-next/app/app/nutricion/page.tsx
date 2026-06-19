import { Button, Card, PageHeader } from "@/components/ui";

const links = [
  { href: "/app/nutricion/diario", title: "Diario", desc: "Comidas del día" },
  { href: "/app/nutricion/registrar", title: "Registrar", desc: "Añadir comida" },
  { href: "/app/nutricion/escaner", title: "Escáner", desc: "Escanear producto" },
  { href: "/app/nutricion/macros", title: "Macros", desc: "Objetivos calóricos" },
  { href: "/app/nutricion/plan", title: "Plan", desc: "Plan semanal" },
  { href: "/app/nutricion/recetas", title: "Recetas", desc: "Biblioteca" },
  { href: "/app/nutricion/favoritos", title: "Favoritos", desc: "Guardados" },
];

export default function NutricionHubPage() {
  return (
    <div>
      <PageHeader title="Nutrición" subtitle="Controla lo que comes con datos reales" />
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Card key={l.href}>
            <h3 className="font-semibold">{l.title}</h3>
            <p className="mt-1 text-sm text-muted">{l.desc}</p>
            <Button href={l.href} className="mt-3" variant="secondary">
              Abrir
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

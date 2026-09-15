import { Button, Card, PageHeader } from "@/components/ui";

const links = [
  { href: "/app/biometricos/hoy", title: "Hoy", desc: "Recuperación y strain" },
  { href: "/app/biometricos/sueno", title: "Sueño", desc: "Calidad del sueño" },
  { href: "/app/biometricos/hrv", title: "HRV", desc: "Tendencias" },
  { href: "/app/biometricos/corazon", title: "Corazón", desc: "FC en reposo" },
  { href: "/app/biometricos/cuerpo", title: "Cuerpo", desc: "Peso y medidas" },
];

export default function BiometricosHubPage() {
  return (
    <div>
      <PageHeader title="Biométricos" subtitle="Tus métricas de recuperación y composición corporal" />
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

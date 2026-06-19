import { Button, Card, PageHeader } from "@/components/ui";

const links = [
  { href: "/app/biometricos/hoy", title: "Hoy", desc: "Readiness y strain" },
  { href: "/app/biometricos/sueno", title: "Sueño", desc: "Calidad y fases" },
  { href: "/app/biometricos/hrv", title: "HRV", desc: "Tendencias" },
  { href: "/app/biometricos/corazon", title: "Corazón", desc: "FC y zonas" },
  { href: "/app/biometricos/cuerpo", title: "Cuerpo", desc: "Peso y medidas" },
  { href: "/app/biometricos/dispositivos", title: "Dispositivos", desc: "Zepp, Whoop, Garmin" },
];

export default function BiometricosHubPage() {
  return (
    <div>
      <PageHeader title="Biométricos" subtitle="Whoop + Zepp en un solo lugar" />
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

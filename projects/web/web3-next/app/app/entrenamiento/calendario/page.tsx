import { Card, PageHeader } from "@/components/ui";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioPage() {
  return (
    <div>
      <PageHeader title="Calendario de entreno" />
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => (
          <Card key={d} className="p-3 text-center">
            <p className="text-xs font-semibold">{d}</p>
            <p className="mt-2 text-[10px] text-muted">—</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

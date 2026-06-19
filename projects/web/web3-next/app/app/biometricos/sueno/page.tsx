"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card, PageHeader } from "@/components/ui";
import { useApiData } from "@/hooks/use-api-data";
import { SkeletonCard } from "@/components/Skeleton";
import { ErrorState } from "@/components/ErrorState";

export default function SuenoPage() {
  const { token } = useAuth();

  const { data, loading, error, refetch } = useApiData(
    () => api.biometrics(token!, "sleep_score", 7),
    [token],
    { enabled: !!token },
  );

  if (loading) return <SkeletonCard />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const chartData = data
    ? data.readings.map((rd, i) => ({ day: `D${i + 1}`, value: rd.value }))
    : [];

  return (
    <div>
      <PageHeader title="Sueño" />
      <Card>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

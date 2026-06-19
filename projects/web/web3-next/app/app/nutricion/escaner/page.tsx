"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api, type Product } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button, Card, PageHeader, ScoreBadge } from "@/components/ui";

const BarcodeScanner = dynamic(
  () => import("@/components/BarcodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false },
);

export default function EscanerPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (code: string) => {
    setLoading(true);
    try {
      const { product: p } = token
        ? await api.scanProduct(token, code, true)
        : await api.productByBarcode(code);
      setProduct(p);
      setBarcode(code);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Escáner de productos" subtitle="Estilo Yuka con score TRACKLIFE" />
      <Card className="mb-4">
        <BarcodeScanner onScan={lookup} />
        <div className="mt-4 flex gap-2">
          <input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Código de barras manual"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <Button onClick={() => lookup(barcode)} variant="secondary" disabled={loading}>
            Buscar
          </Button>
        </div>
      </Card>
      {product && (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              {product.brand && <p className="text-sm text-muted">{product.brand}</p>}
            </div>
            <ScoreBadge score={product.health_score} />
          </div>
          {product.alerts && product.alerts.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-yellow-400">
              {product.alerts.map((a, i) => <li key={i}>⚠ {a}</li>)}
            </ul>
          )}
          <Button
            className="mt-4"
            onClick={() => router.push(`/app/nutricion/registrar`)}
          >
            Añadir al diario
          </Button>
        </Card>
      )}
    </div>
  );
}

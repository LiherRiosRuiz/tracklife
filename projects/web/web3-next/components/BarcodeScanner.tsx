"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const id = "tracklife-scanner";
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;

    if (!started.current) {
      started.current = true;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded) => onScan(decoded),
          () => {},
        )
        .catch(() => setError("No se pudo acceder a la cámara. Introduce el código manualmente."));
    }

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div>
      <div id="tracklife-scanner" className="overflow-hidden rounded-2xl border border-border" />
      {error && <p className="mt-2 text-sm text-warning">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Catat untuk diagnostik server-side; jangan tampilkan detail ke user.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <Alert tone="danger" title="Terjadi kesalahan">
        <p>
          Halaman gagal dimuat. Coba lagi, atau hubungi admin bila masalah
          berlanjut.
        </p>
      </Alert>
      <div>
        <Button variant="secondary" onClick={reset}>
          Coba lagi
        </Button>
      </div>
    </div>
  );
}

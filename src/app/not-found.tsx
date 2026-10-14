import Link from "next/link";
import { Alert } from "@/components/ui/Alert";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info" title="Halaman tidak ditemukan">
        <p>
          Alamat yang diminta tidak ada.{" "}
          <Link href="/" className="font-medium underline">
            Kembali ke beranda
          </Link>
          .
        </p>
      </Alert>
    </div>
  );
}

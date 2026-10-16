import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Notulensi 16 Okt 2026",
  description:
    "Notulensi rapat penatalayanan dan panitia 16 Okt 2026: setlist, aransemen, sequencer, dan portal latihan.",
};

const CANONICAL_URL =
  "https://myth-yg.vercel.app/notulensi/2026-10-16";
const WA_SHARE_URL =
  "https://wa.me/?text=" +
  encodeURIComponent(
    `Notulensi 16 Okt 2026 — Praise 2 lagu (WL pilih), Worship Sungguh Indah + Bapa Sentuh Hatiku, sequencer hanya 2 praise. Baca: ${CANONICAL_URL}`,
  );

function Callout({
  tone,
  children,
}: {
  tone: "info" | "plan";
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "plan"
          ? "rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-zinc-800 dark:bg-amber-950/40 dark:text-zinc-200"
          : "rounded-lg border-l-4 border-zinc-300 bg-zinc-100 p-3 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
      }
    >
      {children}
    </div>
  );
}

export default function Notulensi16102026Page() {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Notulensi</Badge>
        <Badge tone="neutral">16 Okt 2026</Badge>
        <Badge tone="success">Publik</Badge>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Rapat Penatalayanan &amp; Panitia — 16 Okt 2026
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Persiapan Ibadah Pemuda Wilayah GMIM Jabodetabek–Bandung, 21 Nov
          2026. Halaman ini publik dan bisa dibaca tanpa akun.
        </p>
      </div>

      <Card title="Keputusan setlist">
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold">
              Opening — tetap{" "}
              <Badge tone="success">Diputuskan</Badge>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Ku Tak Pandang dari Gereja Mana (Tradisional).
            </p>
          </div>

          <div>
            <p className="font-semibold">
              Praise — 2 lagu{" "}
              <Badge tone="warning">WL memilih</Badge>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              WL memilih 2 dari 3 kandidat di bawah, atau mengusulkan lagu
              baru.
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="font-medium">Hari Terbaik</span>{" "}
                <Badge tone="neutral">Kandidat</Badge>
                <span className="block text-xs text-zinc-500">
                  LOJ Worship ft HSM · Key D (modulasi ke E di chorus) · 117
                  BPM · materi: link referensi
                </span>
              </li>
              <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="font-medium">Great is our God</span>{" "}
                <Badge tone="neutral">Kandidat</Badge>
                <span className="block text-xs text-zinc-500">
                  NDC Worship · Key D · materi: link referensi + chord
                </span>
              </li>
              <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="font-medium">PRAISE</span>{" "}
                <Badge tone="neutral">Kandidat</Badge>
                <span className="block text-xs text-zinc-500">
                  Elevation Worship · Key A · 127 BPM · ±5 mnt · materi: link
                  referensi
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold">
              Worship <Badge tone="success">Diputuskan</Badge>
            </p>
            <ul className="mt-1 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
              <li>
                Pengakuan Dosa: <strong>Sungguh Indah</strong> (Robert &amp;
                Lea Sutanto, key A, chord tersedia).
              </li>
              <li>
                Berita Anugerah oleh Khadim — <em>tanpa lagu</em>, hanya
                narasi.
              </li>
              <li>
                Sebelum Firman: <strong>Bapa Sentuh Hatiku</strong> (Maria
                Shandi, key G, chord tersedia) — lagu dikembalikan ke WL.
              </li>
              <li>Lagu setelah Firman: tetap sama.</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold">
              Tidak lagi dipakai <Badge tone="neutral">Dikeluarkan</Badge>
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              Seputih Bulu Domba tidak lagi masuk setlist. Tetap arsip (tidak
              dihapus dari riwayat): Yesus Baik, Ku Hidup, Oceans, NNBT 15.
            </p>
          </div>

          <div>
            <p className="font-semibold">
              Segmen lain — tetap <Badge tone="success">Diputuskan</Badge>
            </p>
            <ul className="mt-1 list-disc pl-5 text-zinc-600 dark:text-zinc-400">
              <li>Persembahan: NNBT No. 20 Kami Bersyukur padaMu Tuhan.</li>
              <li>Berkat: Joyful Gathering (IT&apos;S GEHC, key F).</li>
              <li>Closing: Obor Pembangunan (Mars Pemuda GMIM, key E).</li>
              <li>
                Ice breaking (4 lagu): Mentega &amp; Roti (D) · Satu Anak
                Tuhan (G) · Bapa Abraham (D) · Kucinta Keluarga Tuhan (D).
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Aransemen menuju final">
        <div className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            MD mengirim aransemen versi terbaru secara berkala. Setelah itu
            diadakan <strong>voting</strong> untuk memilih aransemen yang
            paling cocok, lalu dinyatakan <strong>final</strong>.
          </p>
          <Callout tone="plan">
            <strong>Rencana:</strong> fitur voting aransemen di portal. Untuk
            saat ini voting dilakukan lewat koordinasi biasa (bukan tombol di
            website).
          </Callout>
          <ul className="list-disc pl-5">
            <li>
              Versi teknis per alat musik, termasuk versi minus-one untuk
              dilatih para penyanyi.
            </li>
            <li>Aransemen full-song untuk Tim Rebana Banners.</li>
            <li>
              Para pemusik yang dipilih sudah cenderung pro di bagiannya
              masing-masing — jadi benar-benar mengulik lagu.
            </li>
          </ul>
        </div>
      </Card>

      <Card title="Struktur lagu">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          MD membuat garis besar urutan lagu (Verse, Chorus, Bridge, dan
          lain-lain), tetapi urutan bisa menyesuaikan hasil latihan onsite.
          Fokus sementara: <strong>kesamaan pemahaman melodis</strong>; pola
          urutan disesuaikan belakangan.
        </p>
      </Card>

      <Card title="Sequencer">
        <ul className="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            Sequencer hanya dipakai untuk <strong>2 lagu praise</strong>.
          </li>
          <li>
            Usulan: untuk praise, gunakan referensi lagu yang bahannya sudah
            tersedia (ready-to-use) di internet — tidak perlu dibuat ulang.
          </li>
          <li>
            MD membuka peluang ini; pemilihan 2 lagu dikoordinasikan bersama
            WL secara paralel.
          </li>
        </ul>
      </Card>

      <Card title="Portal latihan">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Maksimalkan fitur website untuk latihan dan beri usulan di setiap
          lagu. Ikuti timeline yang berjalan — MD mengupdate semua informasi
          di portal.
        </p>
      </Card>

      <Card title="Tindak lanjut">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Aksi · WL</Badge>
            <span>Memilih 2 lagu praise (dari 3 kandidat atau usul baru).</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Aksi · MD</Badge>
            <span>Mengirim aransemen versi terbaru secara berkala.</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Aksi · MD + WL</Badge>
            <span>
              Koordinasi paralel memilih 2 lagu praise + bahan sequencer yang
              ready-to-use.
            </span>
          </li>
        </ul>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          href={WA_SHARE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Bagikan ke WhatsApp
        </a>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Punya akun? Masuk ke portal
        </Link>
      </div>
    </article>
  );
}

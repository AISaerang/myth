import { Badge } from "@/components/ui/Badge";

// Nomor urut di dalam SongBatch. Bukan SongStatusBadge dan bukan
// urutan setlist EventSong.
export function BatchOrderBadge({
  badge,
  batchName,
}: {
  badge: number;
  batchName?: string | null;
}) {
  const label = batchName
    ? `Badge batch ${batchName} nomor ${badge}`
    : `Badge batch nomor ${badge}`;
  return (
    <Badge tone="neutral">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{batchName ? `${batchName} · ${badge}` : badge}</span>
    </Badge>
  );
}

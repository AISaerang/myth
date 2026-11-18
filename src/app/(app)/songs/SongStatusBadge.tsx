import { Badge } from "@/components/ui/Badge";
import type { SongStatus } from "@/generated/prisma/client";
import { SONG_STATUS_LABEL, songStatusTone } from "@/lib/song-status";

export function SongStatusBadge({
  status,
  short = false,
}: {
  status: SongStatus;
  short?: boolean;
}) {
  const tone = songStatusTone(status);
  const label = short
    ? `Kerja: ${SONG_STATUS_LABEL[status]}`
    : `Status kerja: ${SONG_STATUS_LABEL[status]}`;

  return (
    <Badge tone={tone === "info" ? "neutral" : tone}>
      {label}
    </Badge>
  );
}

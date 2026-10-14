import { Badge } from "@/components/ui/Badge";
import type { SongStatus } from "@/generated/prisma/client";
import { SONG_STATUS_LABEL, songStatusTone } from "@/lib/song-status";

export function SongStatusBadge({ status }: { status: SongStatus }) {
  const tone = songStatusTone(status);
  return (
    <Badge tone={tone === "info" ? "neutral" : tone}>
      {SONG_STATUS_LABEL[status]}
    </Badge>
  );
}

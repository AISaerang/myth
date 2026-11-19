export interface BackfillArrangement {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface BackfillSong {
  id: string;
  createdById: string;
  arrangements: BackfillArrangement[];
  hasInstrumentChart: boolean;
}

export interface ArrangementBackfillPlan {
  arrangementsToCreate: {
    songId: string;
    name: "Default";
    isActive: true;
  }[];
  defaultBySong: Record<
    string,
    { arrangementId: string | null; name: string }
  >;
  eventSongArrangement: Record<string, string>;
  instrumentChartArrangement: Record<string, string>;
}

export function planArrangementBackfill(
  songs: readonly BackfillSong[],
  eventSongIds: readonly { eventId: string; songId: string }[],
): ArrangementBackfillPlan {
  const arrangementsToCreate: ArrangementBackfillPlan["arrangementsToCreate"] =
    [];
  const defaultBySong: ArrangementBackfillPlan["defaultBySong"] = {};
  const eventSongArrangement: Record<string, string> = {};
  const instrumentChartArrangement: Record<string, string> = {};

  for (const song of songs) {
    if (song.arrangements.length === 0) {
      arrangementsToCreate.push({
        songId: song.id,
        name: "Default",
        isActive: true,
      });
      const syntheticId = `arr-default-${song.id}`;
      defaultBySong[song.id] = {
        arrangementId: syntheticId,
        name: "Default",
      };
      if (song.hasInstrumentChart) {
        instrumentChartArrangement[song.id] = syntheticId;
      }
      continue;
    }

    const active =
      song.arrangements
        .filter((arrangement) => arrangement.isActive)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0] ??
      [...song.arrangements].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      )[0];
    if (!active) continue;
    defaultBySong[song.id] = {
      arrangementId: active.id,
      name: active.name,
    };
    if (song.hasInstrumentChart) {
      instrumentChartArrangement[song.id] = active.id;
    }
  }

  for (const row of eventSongIds) {
    const arrangement = defaultBySong[row.songId]?.arrangementId;
    if (arrangement) {
      eventSongArrangement[`${row.eventId}:${row.songId}`] = arrangement;
    }
  }
  return {
    arrangementsToCreate,
    defaultBySong,
    eventSongArrangement,
    instrumentChartArrangement,
  };
}

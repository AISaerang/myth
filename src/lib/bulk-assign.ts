// Pure plan for bulk SongAssignment. Existing unique (songId, personId)
// pairs are skipped. A pair already used by another event is an error
// and is not created. This does not check authorization.

export interface BulkAssignPerson {
  personId: string;
  displayName: string;
  activeMember: boolean;
  instrumentSkillId: string | null;
}

export interface BulkAssignSong {
  songId: string;
  eventSongId: string;
  title: string;
}

export interface BulkAssignExisting {
  songId: string;
  personId: string;
  eventSongId: string | null;
}

export interface BulkAssignCreate {
  songId: string;
  eventSongId: string;
  personId: string;
  instrumentSkillId: string | null;
  displayName: string;
  title: string;
}

export interface BulkAssignPlan {
  created: number;
  skipped: number;
  errors: string[];
  toCreate: BulkAssignCreate[];
}

export function planBulkAssignments(
  people: readonly BulkAssignPerson[],
  songs: readonly BulkAssignSong[],
  existing: readonly BulkAssignExisting[],
): BulkAssignPlan {
  const existingByPair = new Map(
    existing.map((row) => [`${row.songId}::${row.personId}`, row]),
  );
  const errors: string[] = [];
  const toCreate: BulkAssignCreate[] = [];
  let skipped = 0;

  for (const person of people) {
    if (!person.activeMember) {
      errors.push(`${person.displayName} bukan pemusik/penyanyi anggota event ini.`);
      continue;
    }
    for (const song of songs) {
      const found = existingByPair.get(`${song.songId}::${person.personId}`);
      if (found) {
        if (found.eventSongId && found.eventSongId !== song.eventSongId) {
          errors.push(
            `${person.displayName} sudah ditugaskan ke "${song.title}" di event lain.`,
          );
        } else {
          skipped += 1;
        }
        continue;
      }
      toCreate.push({
        songId: song.songId,
        eventSongId: song.eventSongId,
        personId: person.personId,
        instrumentSkillId: person.instrumentSkillId,
        displayName: person.displayName,
        title: song.title,
      });
    }
  }

  return { created: toCreate.length, skipped, errors, toCreate };
}

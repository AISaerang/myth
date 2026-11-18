import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser } from "@/lib/auth";
import { listSongLibrary } from "@server/services/song-service";
import { ArchiveButton } from "./ArchiveButton";
import { RestoreButton } from "./RestoreButton";

export default async function SongLibraryPage() {
  await requireAdminUser();
  const allSongs = await listSongLibrary(true);
  const activeSongs = allSongs.filter((s) => !s.archivedAt);
  const archivedSongs = allSongs.filter((s) => s.archivedAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Pustaka Lagu
        </h1>
        <Link href="/songs" className="text-sm font-medium underline">
          Kembali ke setlist
        </Link>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Lagu master dipakai bersama; detail nada, status, dan publikasi diatur
        per event melalui setlist.
      </p>

      <Card title={`Lagu aktif (${activeSongs.length})`}>
        {activeSongs.length === 0 ? (
          <EmptyState title="Belum ada lagu aktif" />
        ) : (
          <ul className="flex flex-col gap-2">
            {activeSongs.map((song) => (
              <li
                key={song.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-zinc-500">
                    {[song.artistOrAuthor, song.key ? `Asli: ${song.key}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Tanpa metadata tambahan"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Dipakai di {song._count.eventSongs} event
                  </p>
                </div>
                <Link
                  href={`/songs/${song.id}/chart`}
                  className="text-sm font-medium underline"
                >
                  Lihat chart master
                </Link>
                {song.eventId ? (
                  <ArchiveButton songId={song.id} eventId={song.eventId} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {archivedSongs.length > 0 && (
        <Card title={`Lagu diarsipkan (${archivedSongs.length})`}>
          <p className="text-xs text-zinc-500 mb-3">
            Lagu diarsipkan tidak muncul di daftar default atau pemilihan lagu
            event. Aktifkan kembali lewat tombol di bawah.
          </p>
          <ul className="flex flex-col gap-2">
            {archivedSongs.map((song) => (
              <li
                key={song.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 opacity-75"
              >
                <div>
                  <p className="font-medium text-zinc-500">{song.title}</p>
                  <p className="text-sm text-zinc-500">
                    {[song.artistOrAuthor, song.key ? `Asli: ${song.key}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Tanpa metadata tambahan"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Diarsipkan
                    {song.archivedAt ? ` · ${new Date(song.archivedAt).toLocaleDateString("id-ID")}` : ""}
                  </p>
                </div>
                {song.eventId ? (
                  <RestoreButton songId={song.id} eventId={song.eventId} />
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireAdminUser } from "@/lib/auth";
import { listSongLibrary } from "@server/services/song-service";

export default async function SongLibraryPage() {
  await requireAdminUser();
  const songs = await listSongLibrary();

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
      <Card title={`Lagu master (${songs.length})`}>
        {songs.length === 0 ? (
          <EmptyState title="Pustaka masih kosong" />
        ) : (
          <ul className="flex flex-col gap-2">
            {songs.map((song) => (
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
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

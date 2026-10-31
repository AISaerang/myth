import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { requireAdminUser, requireFreshUser } from "@/lib/auth";
import { isAdmin, isObserver } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getBatch } from "@server/services/batch-service";
import { listSongs } from "@server/services/song-service";
import {
  listPersonnelForAdmin,
  listSkills,
} from "@server/services/personnel-service";
import { SongStatusBadge } from "../../songs/SongStatusBadge";
import { BatchForm } from "../BatchForm";
import { BatchStatusBadge } from "../BatchStatusBadge";
import { BatchItemMover } from "@/components/ui/MoveButtons";
import {
  AddSongForm,
  AssignBatchForm,
  BatchStatusChanger,
  RemoveSongButton,
} from "./BatchDetailForms";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFreshUser();
  const admin = isAdmin(user);
  // Non-admin (USER/OBSERVER): tampilan read-only, lagu Publish saja.
  const observer = !isAdmin(user);
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) notFound();

  if (observer) {
    const published = batch.items.filter((i) => i.song.isPublished);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {batch.name}
          </h1>
          <BatchStatusBadge status={batch.status} />
        </div>
        {batch.description ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {batch.description}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          {batch.releaseAt ? (
            <span>
              Rilis: {formatJakarta(batch.releaseAt, { hour: undefined, minute: undefined })}
            </span>
          ) : null}
          {batch.targetReviewAt ? (
            <span>
              Target review:{" "}
              {formatJakarta(batch.targetReviewAt, { hour: undefined, minute: undefined })}
            </span>
          ) : null}
        </div>
        <Card title={`Lagu publish dalam batch (${published.length})`}>
          {published.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada lagu publish di batch ini.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {published.map((item, index) => (
                <li
                  key={item.songId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-zinc-500">
                      {index + 1}
                    </span>
                    <Link href={`/songs/${item.songId}`} className="font-medium underline">
                      {item.song.title}
                    </Link>
                  </span>
                  <SongStatusBadge status={item.song.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  const eventSongs = await listSongs(batch.eventId);
  const inBatch = new Set(batch.items.map((i) => i.songId));
  const available = eventSongs.filter((s) => !inBatch.has(s.id));
  const [people, skills] = await Promise.all([
    listPersonnelForAdmin(),
    listSkills(),
  ]);
  const activePeople = people
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      skills: p.skills.map((s) => s.name),
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {batch.name}
        </h1>
        <BatchStatusBadge status={batch.status} />
      </div>
      {batch.description ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {batch.description}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        {batch.releaseAt ? (
          <span>
            Rilis: {formatJakarta(batch.releaseAt, { hour: undefined, minute: undefined })}
          </span>
        ) : null}
        {batch.targetReviewAt ? (
          <span>
            Target review:{" "}
            {formatJakarta(batch.targetReviewAt, { hour: undefined, minute: undefined })}
          </span>
        ) : null}
      </div>

      <Card title="Status batch">
        <BatchStatusChanger batchId={batch.id} current={batch.status} />
      </Card>

      <Card title={`Lagu dalam batch (${batch.items.length})`}>
        <div className="flex flex-col gap-3">
          {batch.items.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada lagu.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {batch.items.map((item, index) => (
                <li
                  key={item.songId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs text-zinc-500">
                      {index + 1}
                    </span>
                    <Link href={`/songs/${item.songId}`} className="font-medium underline">
                      {item.song.title}
                    </Link>
                  </span>
                  <span className="flex items-center gap-2">
                    <BatchItemMover
                      batchId={batch.id}
                      orderedIds={batch.items.map((i) => i.songId)}
                      index={index}
                      title={item.song.title}
                    />
                    <SongStatusBadge status={item.song.status} />
                    <RemoveSongButton
                      batchId={batch.id}
                      songId={item.songId}
                      title={item.song.title}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <AddSongForm batchId={batch.id} songs={available} />
        </div>
      </Card>

      <Card title="Assign sebatch">
        <AssignBatchForm
          batchId={batch.id}
          people={activePeople}
          skills={skills}
          songs={batch.items.map((i) => ({ id: i.songId, title: i.song.title }))}
        />
      </Card>

      <BatchForm
        mode="edit"
        batchId={batch.id}
        defaults={{
          name: batch.name,
          description: batch.description,
          releaseAt: batch.releaseAt
            ? batch.releaseAt.toISOString().slice(0, 10)
            : undefined,
          targetReviewAt: batch.targetReviewAt
            ? batch.targetReviewAt.toISOString().slice(0, 10)
            : undefined,
        }}
      />
    </div>
  );
}

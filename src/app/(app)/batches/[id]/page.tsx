import Link from "next/link";
import { notFound } from "next/navigation";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/db";
import { visibleMedleyItems } from "@/lib/medley-groups";
import { badgeFromSortOrders, batchBadgeAnchor } from "@/lib/batch-badge";
import { requireFreshUser } from "@/lib/auth";
import { canReadDrafts, canWriteEventData, isAdmin } from "@/lib/permissions";
import { formatJakarta } from "@/lib/format";
import { getBatch, listMedleyTransitions } from "@server/services/batch-service";
import { listSongs } from "@server/services/song-service";
import {
  listPersonnelForAdmin,
  listSkills,
} from "@server/services/personnel-service";
import { SongStatusBadge } from "../../songs/SongStatusBadge";
import { BatchForm } from "../BatchForm";
import { BatchStatusBadge } from "../BatchStatusBadge";
import { getEventRole } from "@server/services/event-access";
import { BatchItemMover } from "@/components/ui/MoveButtons";
import { MedleyLabelForm } from "../MedleyLabelForm";
import { MedleyGroupCards } from "../MedleyGroupCards";
import {
  AddSongForm,
  AssignBatchForm,
  BatchArrangementPicker,
  BatchStatusChanger,
  RemoveSongButton,
} from "./BatchDetailForms";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFreshUser();
  // Non-admin (USER/OBSERVER): tampilan read-only, lagu Publish saja.
  const observer = !isAdmin(user);
  const { id } = await params;
  const batch = await getBatch(id);
  if (!batch) notFound();
  const [eventRole, event, transitions] = await Promise.all([
    getEventRole(user, batch.eventId),
    prisma.event.findUnique({
      where: { id: batch.eventId },
      select: { accessClosedAt: true },
    }),
    listMedleyTransitions(batch.id),
  ]);
  if (!eventRole || !event) notFound();
  const canWriteMedley = canWriteEventData(
    eventRole,
    Boolean(event.accessClosedAt),
    isAdmin(user),
  );
  const medleyItems = visibleMedleyItems(
    batch.items.map((item) => ({
      ...item,
      title: item.song.title,
      isPublished: item.song.isPublished,
      archived: item.song.archivedAt !== null,
    })),
    !canReadDrafts(eventRole),
  );
  const medleyCard = (
    <MedleyGroupCards
      batchId={batch.id}
      eventId={batch.eventId}
      items={medleyItems}
      transitions={transitions}
      canWrite={canWriteMedley}
    />
  );

  const sortOrders = batch.items.map((item) => item.sortOrder);
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
        {medleyCard}
        <Card title={`Lagu publish dalam batch (${published.length})`}>
          {published.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada lagu publish di batch ini.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {published.map((item) => {
                const badge = badgeFromSortOrders(item.sortOrder, sortOrders);
                return (
                <li
                  key={item.songId}
                  id={batchBadgeAnchor(batch.id, badge)}
                  className="flex w-full min-w-0 scroll-mt-24 flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <BatchOrderBadge badge={badge} />
                    <Link href={`/songs/${item.songId}?eventId=${batch.eventId}&batchId=${batch.id}`} className="min-w-0 break-words font-medium underline">
                      {item.song.title}
                    </Link>
                  </span>
                  <SongStatusBadge status={item.song.status} />
                </li>
                );
              })}
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
  const arrangements = await prisma.chartArrangement.findMany({
    where: { songId: { in: batch.items.map((item) => item.songId) } },
    select: { id: true, name: true, songId: true },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

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
      {medleyCard}

      <Card title="Status batch">
        <BatchStatusChanger batchId={batch.id} current={batch.status} />
      </Card>

      <Card title={`Lagu dalam batch (${batch.items.length})`}>
        <div className="flex flex-col gap-3">
          {batch.items.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada lagu.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {batch.items.map((item, index) => {
                const badge = badgeFromSortOrders(item.sortOrder, sortOrders);
                return (
                <li
                  key={item.songId}
                  id={batchBadgeAnchor(batch.id, badge)}
                  className="flex w-full min-w-0 scroll-mt-24 flex-col gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <BatchOrderBadge badge={badge} />
                      <Link href={`/songs/${item.songId}?eventId=${batch.eventId}&batchId=${batch.id}`} className="min-w-0 break-words font-medium underline">
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
                  </span>
                  <MedleyLabelForm
                    batchId={batch.id}
                    songId={item.songId}
                    songTitle={item.song.title}
                    label={item.medleyLabel}
                  />
                  <BatchArrangementPicker
                    eventId={batch.eventId}
                    songId={item.songId}
                    currentArrangementId={
                      item.eventSong?.chartArrangementId ?? null
                    }
                    arrangements={arrangements
                      .filter((arrangement) => arrangement.songId === item.songId)
                      .map(({ id, name }) => ({ id, name }))}
                  />
                </li>
                );
              })}
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

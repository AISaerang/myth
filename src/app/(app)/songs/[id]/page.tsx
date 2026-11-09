import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ArchiveSongButton, RestoreSongButton } from "@/components/SongArchiveButtons";
import { BatchOrderBadge } from "@/components/BatchOrderBadge";
import { Badge } from "@/components/ui/Badge";
import { badgesForSong } from "@/lib/batch-badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { resolveMedleyNav } from "@/lib/medley-nav";
import { UI_MODE_COOKIE, uiModeForEvent } from "@/lib/ui-mode";
import {
  canManageEvent,
  canManageSongNotes,
  canReadDrafts,
  canReadEventSong,
  canWriteEventData,
  canWriteSongNotes,
  isAdmin,
  isObserver,
} from "@/lib/permissions";
import { listEventBatchCatalog } from "@server/services/batch-service";
import { getSong, listEventAssignablePeople } from "@server/services/song-service";
import { getCurrentEvent } from "@server/services/event-service";
import { getEventRole } from "@server/services/event-access";
import { listPersonnelForAdmin, listSkills } from "@server/services/personnel-service";
import { getMyProgress, getSongProgress } from "@server/services/progress-service";
import { listChordCharts } from "@server/services/chord-service";
import {
  getActiveArrangementContent,
  listChartSections,
} from "@server/services/chart-arrangement-service";
import {
  listSongNotes,
} from "@server/services/note-service";
import { listSongTasks } from "@server/services/task-service";
import { listRehearsals } from "@server/services/rehearsal-service";
import { prisma } from "@/lib/db";
import { formatJakarta } from "@/lib/format";
import { isTaskOverdue } from "@/lib/task-status";
import { MedleyLabelForm } from "../../batches/MedleyLabelForm";
import { SongForm } from "../SongForm";
import { SongStatusBadge } from "../SongStatusBadge";
import { MATERIAL_CATEGORY_LABEL } from "../material-labels";
import {
  CorrectProgressForm,
  MyProgressForm,
} from "./ProgressForms";
import { CreateSuggestionForm } from "../../tasks/TaskForms";
import { ChordChartSection } from "./ChordChartSection";
import { SongNotes } from "./SongNotes";
import {
  OverdueBadge,
  PracticeStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
} from "../../tasks/WorkBadges";
import {
  AssignForm,
  MaterialActions,
  MaterialForm,
  PublishToggle,
  UnassignButton,
  UnlockButton,
  VersionActions,
  VersionForm,
} from "./SongDetailForms";

function Meta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export default async function SongDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireFreshUser();
  const { id } = await params;
  const { eventId: requestedEventId } = await searchParams;
  const legacySong = requestedEventId
    ? null
    : await prisma.song.findUnique({
        where: { id },
        select: { eventId: true },
      });
  const eventId =
    requestedEventId ??
    legacySong?.eventId ??
    (await getCurrentEvent(user))?.id;
  if (!eventId) notFound();
  const [song, catalog] = await Promise.all([
    getSong(id, eventId),
    listEventBatchCatalog(eventId),
  ]);
  if (!song) notFound();
  const batchBadges = badgesForSong(song.id, catalog);
  const eventRole = await getEventRole(user, song.eventId);
  const admin = isAdmin(user);
  const observer = isObserver(user);
  const eventAccess = await prisma.event.findUnique({
    where: { id: song.eventId },
    select: { accessClosedAt: true },
  });
  const canWrite = canWriteEventData(
    eventRole,
    Boolean(eventAccess?.accessClosedAt),
    admin,
  );
  const previewing =
    uiModeForEvent((await cookies()).get(UI_MODE_COOKIE)?.value, song.eventId) ===
      "preview" &&
    (admin || canManageEvent(eventRole));
  const canEditSong = canWrite && !previewing;
  const medleyNav = resolveMedleyNav(song.id, catalog, {
    publishedOnly: previewing || !(admin || canReadDrafts(eventRole)),
  });
  const medleyLabels = [
    ...new Set(
      batchBadges
        .map((badge) => badge.medleyLabel)
        .filter((label): label is string => Boolean(label)),
    ),
  ];
  if (
    !canReadEventSong(
      user,
      song.eventId,
      eventId,
      song.isPublished,
      eventRole,
    )
  ) {
    notFound();
  }
  if (previewing && !song.isPublished) notFound();
  let myAssignment: (typeof song.assignments)[number] | undefined;
  if (!canEditSong && !observer) {
    const person = await prisma.person.findUnique({
      where: { userId: user.id },
    });
    myAssignment = person
      ? song.assignments.find((a) => a.personId === person.id)
      : undefined;
  }

  const assignedInstrumentSkillIds =
    myAssignment?.instrumentSkillId
      ? [myAssignment.instrumentSkillId]
      : [];
  const [songNotes, chartSections, skillRows] = await Promise.all([
    listSongNotes(song.eventSongId, {
      userId: user.id,
      eventRole,
      globalAdmin: admin,
      observer,
      assignedInstrumentSkillIds,
    }),
    listChartSections(song.id),
    prisma.instrumentSkill.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const noteTargetOptions = [
    ...new Map(
      song.assignments
        .filter((assignment) => assignment.instrumentSkill)
        .map((assignment) => [
          assignment.instrumentSkill!.id,
          {
            id: assignment.instrumentSkill!.id,
            name: assignment.instrumentSkill!.name,
          },
        ]),
    ).values(),
  ];
  const canWriteNotes =
    !previewing &&
    canWriteSongNotes(
      user,
      eventRole,
      Boolean(eventAccess?.accessClosedAt),
      song.isPublished,
    );
  const sharedEventCount = canEditSong
    ? await prisma.eventSong.count({ where: { songId: song.id } })
    : 0;
  const songEventId = song.eventId;
  function canManageThisMaterial(materialEventId: string | null): boolean {
    if (!canEditSong) return false;
    if (materialEventId === songEventId) return true;
    return admin && materialEventId == null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {song.title}
        </h1>
        <SongStatusBadge status={song.status} />
        {batchBadges.map((badge) => (
          <BatchOrderBadge
            key={badge.anchorId}
            badge={badge.badge}
            batchName={badge.batchName}
          />
        ))}
        {medleyLabels.length > 0 ? (
          <span className="text-sm text-zinc-500">
            Medley: {medleyLabels.join(" · ")}
          </span>
        ) : null}
        {song.isPublished ? (
          <Badge tone="success">Publikasi</Badge>
        ) : (
          <Badge tone="neutral">Draft internal</Badge>
        )}
        {song.isFinalLocked ? <Badge tone="danger">Final terkunci</Badge> : null}
      </div>

      {medleyNav.next.length > 0 || medleyNav.back ? (
        <nav aria-label="Navigasi setlist" className="flex flex-col gap-2 text-sm">
          {medleyNav.next.map((link) => (
            <Link
              key={`${link.batchId}-${link.songId}`}
              href={`/songs/${link.songId}?eventId=${song.eventId}`}
              className="font-medium underline"
            >
              Lagu berikutnya
              {medleyNav.next.length > 1 ? ` (${link.batchName})` : ""}: {link.title}
              <span className="block text-xs font-normal text-zinc-500">
                {link.medleyLabel}
              </span>
            </Link>
          ))}
          {medleyNav.back ? (
            <Link
              href={`/songs?eventId=${song.eventId}#${medleyNav.back.anchorId}`}
              className="font-medium underline"
            >
              Kembali ke badge {medleyNav.back.badge}
              {medleyNav.back.batchName ? ` · ${medleyNav.back.batchName}` : ""}
            </Link>
          ) : null}
        </nav>
      ) : null}

      <Card title="Overview">
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Meta label="Fungsi liturgi" value={song.liturgicalFunction} />
          <Meta label="Artis/pencipta" value={song.artistOrAuthor} />
          <Meta label="Key" value={song.key} />
          <Meta label="Tempo" value={song.bpm ? `${song.bpm} BPM` : null} />
          <Meta label="Birama" value={song.timeSignature} />
          <Meta
            label="Estimasi durasi"
            value={
              song.estimatedDurationSeconds
                ? `${Math.floor(song.estimatedDurationSeconds / 60)}:${String(song.estimatedDurationSeconds % 60).padStart(2, "0")}`
                : null
            }
          />
          <Meta label="Event" value={song.event.name} />
          <Meta
            label="Batch"
            value={song.batchItems.map((b) => b.batch.name).join(", ") || null}
          />
        </dl>
        {song.originalReferenceUrl ? (
          <p className="mt-3 text-sm">
            <a
              href={song.originalReferenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Buka referensi original
            </a>
          </p>
        ) : null}
        {song.arrangementNotes ? (
          <div className="mt-3 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
            <p className="font-medium">Arah aransemen (MD)</p>
            <p className="text-zinc-600 dark:text-zinc-400">{song.arrangementNotes}</p>
          </div>
        ) : null}
      </Card>

      {canWrite && !previewing && batchBadges.length > 0 ? (
        <Card title="Medley">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Isi label yang sama pada lagu berurutan di satu batch untuk membuat koridor.
            Di tengah medley, pemusik melihat lagu berikutnya. Kembali ke badge hanya
            muncul di lagu terakhir medley atau lagu di luar medley.
          </p>
          <div className="flex flex-col gap-3">
            {batchBadges.map((badge) => (
              <div key={badge.batchId} className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  {badge.batchName} · badge {badge.badge}
                </p>
                <MedleyLabelForm
                  batchId={badge.batchId}
                  songId={song.id}
                  songTitle={song.title}
                  label={badge.medleyLabel}
                />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!canEditSong && myAssignment ? (
        <Card title="Tugasmu">
          <p className="text-sm">
            {myAssignment.instrumentSkill
              ? `Part: ${myAssignment.instrumentSkill.name}`
              : "Part: sesuai arahan MD"}
            {myAssignment.assignmentNote ? ` — ${myAssignment.assignmentNote}` : ""}
          </p>
        </Card>
      ) : null}

      {canEditSong || observer || myAssignment ? (
        <SongProgress
          songId={song.id}
          eventSongId={song.eventSongId}
          admin={canEditSong}
          observer={observer && !previewing}
          userId={user.id}
        />
      ) : (
        <Card title="Progres latihan">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Kamu dapat melihat lagu ini. Update progres tersedia setelah lagu
            ditugaskan kepadamu.
          </p>
        </Card>
      )}

      <SongChordChart
        songId={song.id}
        eventId={song.eventId}
        eventSongId={song.eventSongId}
        admin={canEditSong}
        sections={chartSections.map((section) => ({
          id: section.id,
          label: section.label,
          type: section.type,
        }))}
        notes={songNotes}
        noteTargetOptions={noteTargetOptions}
        canWriteNotes={canWriteNotes}
        canModerateNotes={
          !previewing && canManageSongNotes(user, eventRole)
        }
        currentUserId={user.id}
        defaultPart={myAssignment?.instrumentSkill?.name ?? null}
      />

      <SongNotes
        songId={song.id}
        eventSongId={song.eventSongId}
        notes={songNotes}
        sections={chartSections.map((section) => ({
          id: section.id,
          label: section.label,
          type: section.type,
        }))}
        partOptions={skillRows.map((row) => row.name)}
        defaultPart={myAssignment?.instrumentSkill?.name ?? null}
        canWrite={canWriteNotes}
        currentUserId={user.id}
        canModerate={!previewing && canManageSongNotes(user, eventRole)}
      />

      <Card title="Materi aktif">
        {song.materials.filter((m) => m.isActive).length === 0 ? (
          <EmptyState title="Belum ada materi aktif" />
        ) : (
          <ul className="flex flex-col gap-2">
            {song.materials
              .filter((m) => m.isActive)
              .map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <p className="font-medium">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {m.title}
                    </a>
                  </p>
                  <p className="text-zinc-500">
                    {MATERIAL_CATEGORY_LABEL[m.category]}
                    {m.versionLabel ? ` · ${m.versionLabel}` : ""}
                  </p>
                  {m.description ? (
                    <p className="text-zinc-600 dark:text-zinc-400">{m.description}</p>
                  ) : null}
                  {canManageThisMaterial(m.eventId) ? (
                    <div className="mt-2">
                      <MaterialActions
                        songId={song.id}
                        materialId={m.id}
                        isActive={m.isActive}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </Card>

      {canEditSong ? (
        <>
          <SongForm
            mode="edit"
            eventId={song.eventId}
            songId={song.id}
            sharedEventCount={sharedEventCount}
            defaults={{
              title: song.title,
              artistOrAuthor: song.artistOrAuthor,
              liturgicalFunction: song.liturgicalFunction,
              key: song.key,
              bpm: song.bpm,
              timeSignature: song.timeSignature,
              estimatedDurationSeconds: song.estimatedDurationSeconds,
              originalReferenceUrl: song.originalReferenceUrl,
              arrangementNotes: song.arrangementNotes,
              status: song.status,
            }}
          />
          <Card title="Publikasi & kunci">
            <div className="flex flex-col gap-3">
              <PublishToggle
                songId={song.id}
                eventId={song.eventId}
                isPublished={song.isPublished}
                isLocked={song.isFinalLocked}
              />
              {song.isFinalLocked ? <UnlockButton eventSongId={song.eventSongId} /> : null}
            </div>
          </Card>
          <AdminPersonnel
            songId={song.id}
            eventId={song.eventId}
            assignments={song.assignments}
            globalDirectory={admin}
          />
          <Card title="Tambah materi">
            <MaterialForm
              songId={song.id}
              eventId={song.eventId}
              versions={song.versions.map((v) => ({
                id: v.id,
                versionLabel: v.versionLabel,
              }))}
            />
          </Card>
          {song.materials.filter((m) => !m.isActive).length > 0 ? (
            <Card title="Materi nonaktif (riwayat)">
              <ul className="flex flex-col gap-2">
                {song.materials
                  .filter((m) => !m.isActive)
                  .map((m) => (
                    <li
                      key={m.id}
                      className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                    >
                      <p className="font-medium">{m.title}</p>
                      <p className="text-zinc-500">
                        {MATERIAL_CATEGORY_LABEL[m.category]}
                        {m.versionLabel ? ` · ${m.versionLabel}` : ""}
                      </p>
                      {canManageThisMaterial(m.eventId) ? (
                        <div className="mt-2">
                          <MaterialActions
                            songId={song.id}
                            materialId={m.id}
                            isActive={m.isActive}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Buat versi aransemen">
            <VersionForm songId={song.id} eventId={song.eventId} />
          </Card>
          {admin ? (
            song.archivedAt ? (
              <RestoreSongButton songId={song.id} eventId={song.eventId} />
            ) : (
              <ArchiveSongButton songId={song.id} eventId={song.eventId} />
            )
          ) : null}
        </>
      ) : null}

      <Card title="Riwayat versi">
        {song.versions.length === 0 ? (
          <EmptyState title="Belum ada versi aransemen" />
        ) : (
          <ul className="flex flex-col gap-3">
            {song.versions.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{v.versionLabel}</p>
                  {v.isActive ? <Badge tone="success">Aktif</Badge> : null}
                  {v.isFinal ? <Badge tone="danger">Final</Badge> : null}
                  {!v.isActive && !v.isFinal ? (
                    <Badge tone="neutral">Digantikan/arsip</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {v.changeSummary}
                </p>
                <p className="text-xs text-zinc-500">
                  {[v.key ? `Key ${v.key}` : null, v.bpm ? `${v.bpm} BPM` : null]
                    .filter(Boolean)
                    .join(" · ")}
                  {v.grooveNotes ? ` · Groove: ${v.grooveNotes}` : ""}
                </p>
                {v.structureNotes ? (
                  <p className="text-xs text-zinc-500">Struktur: {v.structureNotes}</p>
                ) : null}
                {v.referenceUrl ? (
                  <p className="text-xs">
                    <a
                      href={v.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Referensi versi
                    </a>
                  </p>
                ) : null}
                {canEditSong ? (
                  <div className="mt-2">
                    <VersionActions
                      songId={song.id}
                      eventId={song.eventId}
                      eventSongId={song.eventSongId}
                      versionId={v.id}
                      isActive={v.isActive}
                      isLocked={song.isFinalLocked}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SongTasks songId={song.id} eventId={song.eventId} />

      {!canEditSong ? (
        <SongSuggestion
          eventId={song.eventId}
          songId={song.id}
          songTitle={song.title}
        />
      ) : null}
    </div>
  );
}

async function SongChordChart({
  songId,
  eventId,
  eventSongId,
  admin,
  sections,
  notes,
  noteTargetOptions,
  canWriteNotes,
  canModerateNotes,
  currentUserId,
  defaultPart,
}: {
  songId: string;
  eventId: string;
  eventSongId: string;
  admin: boolean;
  sections: {
    id: string;
    label: string;
    type: string;
  }[];
  notes: Awaited<ReturnType<typeof listSongNotes>>;
  noteTargetOptions: { id: string; name: string }[];
  canWriteNotes: boolean;
  canModerateNotes: boolean;
  currentUserId: string;
  defaultPart: string | null;
}) {
  const [charts, arrangement] = await Promise.all([
    listChordCharts(songId),
    getActiveArrangementContent(songId),
  ]);
  return (
    <ChordChartSection
      songId={songId}
      eventId={eventId}
      eventSongId={eventSongId}
      admin={admin}
      charts={charts}
      arrangement={arrangement}
      sections={sections}
      notes={notes}
      noteTargetOptions={noteTargetOptions}
      canWriteNotes={canWriteNotes}
      canModerateNotes={canModerateNotes}
      currentUserId={currentUserId}
      defaultPart={defaultPart}
    />
  );
}

async function SongProgress({
  songId,
  eventSongId,
  admin,
  observer,
  userId,
}: {
  songId: string;
  eventSongId: string;
  admin: boolean;
  observer: boolean;
  userId: string;
}) {
  if (observer) {
    const progress = await getSongProgress(eventSongId);
    const total = progress.length;
    const ready = progress.filter((p) => p.status === "READY_FOR_REHEARSAL").length;
    const needHelp = progress.filter((p) => p.status === "NEEDS_HELP");
    return (
      <Card title={`Progres personel (${ready}/${total} siap)`}>
        {needHelp.length > 0 ? (
          <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
            Perlu bantuan: {needHelp.map((p) => p.person.displayName).join(", ")}
          </p>
        ) : null}
        {progress.length === 0 ? (
          <EmptyState title="Belum ada yang update progres" />
        ) : (
          <ul className="flex flex-col gap-3">
            {progress.map((p) => (
              <li
                key={`${p.songId}-${p.personId}`}
                className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.person.displayName}</span>
                  {!p.person.isActive ? <Badge tone="neutral">Nonaktif</Badge> : null}
                  <PracticeStatusBadge status={p.status} />
                </div>
                {p.note ? (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  }
  if (!admin) {
    const current = await getMyProgress(userId, eventSongId);
    return (
      <Card title="Progres latihanku">
        <MyProgressForm
          songId={songId}
          eventSongId={eventSongId}
          current={current}
        />
      </Card>
    );
  }
  const progress = await getSongProgress(eventSongId);
  const total = progress.length;
  const ready = progress.filter((p) => p.status === "READY_FOR_REHEARSAL").length;
  const needHelp = progress.filter((p) => p.status === "NEEDS_HELP");
  return (
    <Card title={`Progres personel (${ready}/${total} siap)`}>
      {needHelp.length > 0 ? (
        <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">
          Perlu bantuan: {needHelp.map((p) => p.person.displayName).join(", ")}
        </p>
      ) : null}
      {progress.length === 0 ? (
        <EmptyState title="Belum ada yang update progres" />
      ) : (
        <ul className="flex flex-col gap-3">
          {progress.map((p) => (
            <li
              key={`${p.songId}-${p.personId}`}
              className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.person.displayName}</span>
                {!p.person.isActive ? <Badge tone="neutral">Nonaktif</Badge> : null}
                <PracticeStatusBadge status={p.status} />
              </div>
              {p.note ? (
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.note}</p>
              ) : null}
              <div className="mt-2">
                <CorrectProgressForm
                  songId={songId}
                  eventSongId={eventSongId}
                  personId={p.personId}
                  personName={p.person.displayName}
                  current={p.status}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function SongSuggestion({
  eventId,
  songId,
  songTitle,
}: {
  eventId: string;
  songId: string;
  songTitle: string;
}) {
  const rehearsals = await listRehearsals(eventId);
  return (
    <CreateSuggestionForm
      eventId={eventId}
      context={{
        songs: [{ id: songId, title: songTitle }],
        rehearsals: rehearsals.map((r) => ({ id: r.id, title: r.title })),
      }}
      defaultSongId={songId}
    />
  );
}

async function SongTasks({ songId, eventId }: { songId: string; eventId: string }) {
  const tasks = await listSongTasks(songId, eventId);
  if (tasks.length === 0) return null;
  return (
    <Card title={`Task terkait (${tasks.length})`}>
      <ul className="flex flex-col gap-2 text-sm">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
          >
            <span>
              <Link href="/tasks" className="font-medium underline">
                {t.title}
              </Link>
              {t.dueAt ? (
                <span className="block text-xs text-zinc-500">
                  Tenggat {formatJakarta(t.dueAt)}
                </span>
              ) : null}
            </span>
            <span className="flex items-center gap-1">
              {isTaskOverdue(t.status, t.dueAt) ? <OverdueBadge /> : null}
              <TaskPriorityBadge priority={t.priority} />
              <TaskStatusBadge status={t.status} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function AdminPersonnel({
  songId,
  eventId,
  assignments,
  globalDirectory,
}: {
  songId: string;
  eventId: string;
  assignments: NonNullable<Awaited<ReturnType<typeof getSong>>>["assignments"];
  globalDirectory: boolean;
}) {
  const [people, skills] = await Promise.all([
    globalDirectory
      ? listPersonnelForAdmin().then((rows) =>
          rows
            .filter((person) => person.isActive)
            .map((person) => ({
              id: person.id,
              displayName: person.displayName,
            })),
        )
      : listEventAssignablePeople(eventId),
    listSkills(),
  ]);
  const activePeople = people;
  const assignedIds = new Set(assignments.map((a) => a.personId));
  return (
    <Card title={`Personel (${assignments.length})`}>
      <div className="flex flex-col gap-3">
        {assignments.length === 0 ? (
          <EmptyState title="Belum ada personel ditugaskan" />
        ) : (
          <ul className="flex flex-col gap-1">
            {assignments.map((a) => (
              <li
                key={a.personId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span>
                  {a.person.displayName}
                  {a.instrumentSkill ? ` · ${a.instrumentSkill.name}` : ""}
                  {!a.person.isActive ? " (nonaktif)" : ""}
                </span>
                <UnassignButton
                  songId={songId}
                  eventId={eventId}
                  personId={a.personId}
                  name={a.person.displayName}
                />
              </li>
            ))}
          </ul>
        )}
        <AssignForm
          songId={songId}
          eventId={eventId}
          people={activePeople
            .filter((p) => !assignedIds.has(p.id))
            .map((p) => ({ id: p.id, displayName: p.displayName }))}
          skills={skills}
        />
      </div>
    </Card>
  );
}

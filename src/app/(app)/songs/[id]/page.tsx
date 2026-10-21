import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireFreshUser } from "@/lib/auth";
import { isAdmin, isObserver } from "@/lib/permissions";
import { getSong } from "@server/services/song-service";
import { listPersonnelForAdmin, listSkills } from "@server/services/personnel-service";
import { getMyProgress, getSongProgress } from "@server/services/progress-service";
import { listChordCharts } from "@server/services/chord-service";
import { getActiveArrangementContent } from "@server/services/chart-arrangement-service";
import { listSongTasks } from "@server/services/task-service";
import { listRehearsals } from "@server/services/rehearsal-service";
import { prisma } from "@/lib/db";
import { formatJakarta } from "@/lib/format";
import { isTaskOverdue } from "@/lib/task-status";
import { SongForm } from "../SongForm";
import { SongStatusBadge } from "../SongStatusBadge";
import { MATERIAL_CATEGORY_LABEL } from "../material-labels";
import {
  CorrectProgressForm,
  MyProgressForm,
} from "./ProgressForms";
import { CreateSuggestionForm } from "../../tasks/TaskForms";
import { ChordChartSection } from "./ChordChartSection";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireFreshUser();
  const { id } = await params;
  const song = await getSong(id);
  if (!song) notFound();
  const admin = isAdmin(user);
  const observer = isObserver(user);

  if (observer) {
    // Pemantau: boleh membuka semua lagu Publish, tanpa assignment.
    if (!song.isPublished) notFound();
  } else if (!admin) {
    // Personel hanya boleh membuka lagu yang dipublikasi dan ditugaskan.
    const person = await prisma.person.findUnique({
      where: { userId: user.id },
    });
    const assigned = person
      ? song.assignments.some((a) => a.personId === person.id)
      : false;
    if (!song.isPublished || !assigned) notFound();
  }

  const myAssignment = !admin && !observer
    ? song.assignments[0]
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {song.title}
        </h1>
        <SongStatusBadge status={song.status} />
        {song.isPublished ? (
          <Badge tone="success">Publikasi</Badge>
        ) : (
          <Badge tone="neutral">Draft internal</Badge>
        )}
        {song.isFinalLocked ? <Badge tone="danger">Final terkunci</Badge> : null}
      </div>

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

      {!admin && myAssignment ? (
        <Card title="Tugasmu">
          <p className="text-sm">
            {myAssignment.instrumentSkill
              ? `Part: ${myAssignment.instrumentSkill.name}`
              : "Part: sesuai arahan MD"}
            {myAssignment.assignmentNote ? ` — ${myAssignment.assignmentNote}` : ""}
          </p>
        </Card>
      ) : null}

      <SongProgress songId={song.id} admin={admin} observer={observer} userId={user.id} />

      <SongChordChart songId={song.id} admin={admin} />

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
                  {admin ? (
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

      {admin ? (
        <>
          <SongForm
            mode="edit"
            songId={song.id}
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
                isPublished={song.isPublished}
                isLocked={song.isFinalLocked}
              />
              {song.isFinalLocked ? <UnlockButton songId={song.id} /> : null}
            </div>
          </Card>
          <AdminPersonnel songId={song.id} />
          <Card title="Tambah materi">
            <MaterialForm
              songId={song.id}
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
                      <div className="mt-2">
                        <MaterialActions
                          songId={song.id}
                          materialId={m.id}
                          isActive={m.isActive}
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Buat versi aransemen">
            <VersionForm songId={song.id} />
          </Card>
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
                {admin ? (
                  <div className="mt-2">
                    <VersionActions
                      songId={song.id}
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

      <SongTasks songId={song.id} />

      {!admin ? (
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
  admin,
}: {
  songId: string;
  admin: boolean;
}) {
  const [charts, arrangement] = await Promise.all([
    listChordCharts(songId),
    getActiveArrangementContent(songId),
  ]);
  return (
    <ChordChartSection
      songId={songId}
      admin={admin}
      charts={charts}
      arrangement={arrangement}
    />
  );
}

async function SongProgress({
  songId,
  admin,
  observer,
  userId,
}: {
  songId: string;
  admin: boolean;
  observer: boolean;
  userId: string;
}) {
  if (observer) {
    const progress = await getSongProgress(songId);
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
    const current = await getMyProgress(userId, songId);
    return (
      <Card title="Progres latihanku">
        <MyProgressForm songId={songId} current={current} />
      </Card>
    );
  }
  const progress = await getSongProgress(songId);
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

async function SongTasks({ songId }: { songId: string }) {  const tasks = await listSongTasks(songId);
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

async function AdminPersonnel({ songId }: { songId: string }) {
  const song = await getSong(songId);
  if (!song) return null;
  const [people, skills] = await Promise.all([
    listPersonnelForAdmin(),
    listSkills(),
  ]);
  const activePeople = people.filter((p) => p.isActive);
  const assignedIds = new Set(song.assignments.map((a) => a.personId));
  return (
    <Card title={`Personel (${song.assignments.length})`}>
      <div className="flex flex-col gap-3">
        {song.assignments.length === 0 ? (
          <EmptyState title="Belum ada personel ditugaskan" />
        ) : (
          <ul className="flex flex-col gap-1">
            {song.assignments.map((a) => (
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
                  personId={a.personId}
                  name={a.person.displayName}
                />
              </li>
            ))}
          </ul>
        )}
        <AssignForm
          songId={songId}
          people={activePeople
            .filter((p) => !assignedIds.has(p.id))
            .map((p) => ({ id: p.id, displayName: p.displayName }))}
          skills={skills}
        />
      </div>
    </Card>
  );
}

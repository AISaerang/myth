"use client";

import {
  useActionState,
  useCallback,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatJakarta } from "@/lib/format";
import {
  NOTE_STATUS_LABEL,
  NO_SECTION_LABEL,
  type SongNoteTargetOption,
  type SongNoteView,
} from "@/lib/song-note";
import type { ActionState } from "@server/actions/auth";
import {
  createSongNoteAction,
  deleteSongNoteAction,
  resolveSongNoteAction,
  updateSongNoteAction,
} from "@server/actions/notes";

export interface NoteSectionOption {
  id: string;
  label: string;
  type: string;
}

type StatusFilter = "open" | "resolved" | "all";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const textareaClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function SongNotes({
  songId,
  eventSongId,
  notes,
  sections,
  partOptions,
  defaultPart,
  canWrite,
  currentUserId,
  canModerate,
}: {
  songId: string;
  eventSongId: string;
  notes: SongNoteView[];
  sections: NoteSectionOption[];
  partOptions: string[];
  defaultPart: string | null;
  canWrite: boolean;
  currentUserId: string;
  canModerate: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [partFilter, setPartFilter] = useState("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCount = useMemo(
    () => notes.filter((note) => note.status === "OPEN").length,
    [notes],
  );

  const sectionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const section of sections) seen.set(section.id, section.label);
    for (const note of notes) {
      if (note.sectionId && !seen.has(note.sectionId)) {
        seen.set(note.sectionId, note.sectionLabel ?? "Bagian dihapus");
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [notes, sections]);

  const parts = useMemo(() => {
    const seen = new Set(partOptions.filter(Boolean));
    for (const note of notes) {
      if (note.partLabel) seen.add(note.partLabel);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "id"));
  }, [notes, partOptions]);

  const visible = useMemo(
    () =>
      notes.filter((note) => {
        if (statusFilter === "open" && note.status !== "OPEN") return false;
        if (statusFilter === "resolved" && note.status !== "RESOLVED") return false;
        if (sectionFilter === "__none__") {
          if (note.sectionId) return false;
        } else if (sectionFilter !== "all" && note.sectionId !== sectionFilter) {
          return false;
        }
        if (partFilter !== "all" && (note.partLabel ?? "") !== partFilter) {
          return false;
        }
        return true;
      }),
    [notes, statusFilter, sectionFilter, partFilter],
  );

  return (
    <Card title={`Catatan Part (${openCount} terbuka)`}>
      <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
          Semua catatan dan filter
        </summary>
        <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            Catatan tanpa section juga dikelola di sini. Akses catatan target
            dibatasi pada instrumen yang ditugaskan di lagu-event ini.
          </p>
          <datalist id="song-note-parts">
            {parts.map((part) => (
              <option key={part} value={part} />
            ))}
          </datalist>
          {canWrite ? (
            <details className="mb-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
                Tambah catatan umum untuk lagu
              </summary>
              <NoteComposer
                songId={songId}
                eventSongId={eventSongId}
                defaultPart={defaultPart}
                targetOptions={[]}
                sectionId=""
              />
            </details>
          ) : null}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className={inputClass}
              >
                <option value="open">Terbuka</option>
                <option value="resolved">Selesai</option>
                <option value="all">Semua</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Bagian
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Semua bagian</option>
                {sectionOptions.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
                <option value="__none__">{NO_SECTION_LABEL}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Part penulis
              <select
                value={partFilter}
                onChange={(event) => setPartFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">Semua part</option>
                {parts.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              title={
                notes.length === 0
                  ? "Belum ada catatan part"
                  : "Tidak ada catatan yang cocok dengan filter"
              }
              description={
                notes.length === 0 && canWrite
                  ? "Gunakan tombol catatan pada section untuk memberi konteks."
                  : undefined
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((note) => {
                const canModify =
                  canWrite &&
                  (canModerate || note.authorUserId === currentUserId);
                return (
                  <li key={note.id} id={`note-${note.id}`}>
                    <NoteCard
                      note={note}
                      songId={songId}
                      eventSongId={eventSongId}
                      sections={sections}
                      canWrite={canWrite}
                      canModify={canModify}
                      canReply={canWrite && note.status === "OPEN"}
                      canModerate={canModerate}
                      currentUserId={currentUserId}
                      replying={replyingTo === note.id}
                      editing={editingId === note.id}
                      onReply={() => {
                        setEditingId(null);
                        setReplyingTo((current) =>
                          current === note.id ? null : note.id,
                        );
                      }}
                      onEdit={() => {
                        setReplyingTo(null);
                        setEditingId((current) =>
                          current === note.id ? null : note.id,
                        );
                      }}
                      onDone={() => {
                        setReplyingTo(null);
                        setEditingId(null);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>
    </Card>
  );
}

function NoteComposer({
  songId,
  eventSongId,
  defaultPart,
  sectionId,
  targetOptions,
  requireTarget = false,
}: {
  songId: string;
  eventSongId: string;
  defaultPart: string | null;
  sectionId: string;
  targetOptions: SongNoteTargetOption[];
  requireTarget?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    useCallback(async (prev: ActionState, formData: FormData) => {
      const result = await createSongNoteAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    }, []),
    { ok: false },
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-5 flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="eventSongId" value={eventSongId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {targetOptions.length > 0 ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Audiens
            <select
              name="targetInstrumentSkillId"
              defaultValue=""
              required={requireTarget}
              className={inputClass}
            >
              <option value="">
                {requireTarget ? "Pilih instrumen / role" : "Semua personel"}
              </option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="targetInstrumentSkillId" value="" />
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          POV part penulis
          <input
            name="partLabel"
            list="song-note-parts"
            maxLength={80}
            defaultValue={defaultPart ?? ""}
            placeholder="cth. Drum, Keyboard, Gitar"
            className={inputClass}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Catatan
        <textarea
          name="body"
          rows={3}
          required
          minLength={2}
          maxLength={2000}
          placeholder="cth. Verse: half-time groove, hi-hat 8th; Chorus: open hi-hat di beat 3"
          className={textareaClass}
        />
      </label>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Catatan tersimpan.</Alert> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Tambah catatan"}
        </Button>
      </div>
    </form>
  );
}

type SectionAnnotationProps = {
  songId: string;
  eventSongId: string;
  sectionId: string;
  notes: SongNoteView[];
  sections: NoteSectionOption[];
  targetOptions: SongNoteTargetOption[];
  defaultPart: string | null;
  canWrite: boolean;
  canModerate: boolean;
  currentUserId: string;
};

export function SectionTargetNoteCallout({
  songId,
  eventSongId,
  sectionId,
  notes,
  sections,
  targetOptions,
  defaultPart,
  canWrite,
  canModerate,
  currentUserId,
}: SectionAnnotationProps) {
  const targeted = notes.filter(
    (note) =>
      !note.parentId &&
      note.status === "OPEN" &&
      note.targetInstrumentSkillId,
  );
  if (targeted.length === 0 && (!canWrite || targetOptions.length === 0)) {
    return null;
  }
  const composer = canWrite && targetOptions.length > 0 ? (
    <details className="mt-1 border-t border-sky-200 pt-1 dark:border-sky-900">
      <summary className="min-h-11 cursor-pointer px-2 py-2 text-sm font-medium">
        Tambah catatan instrumen
      </summary>
      <NoteComposer
        songId={songId}
        eventSongId={eventSongId}
        defaultPart={defaultPart}
        sectionId={sectionId}
        targetOptions={targetOptions}
        requireTarget
      />
    </details>
  ) : null;
  if (targeted.length === 0) {
    return (
      <details
        data-targeted-section-notes=""
        className="rounded-lg border border-sky-200 px-2 dark:border-sky-900"
      >
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
          Catatan per instrumen
        </summary>
        {composer}
      </details>
    );
  }
  return (
    <div
      data-targeted-section-notes=""
      className="rounded-lg border border-sky-300 bg-sky-50/70 p-2 dark:border-sky-900 dark:bg-sky-950/30"
    >
      <ul className="flex flex-col gap-2">
        {targeted.map((note) => (
          <li key={note.id}>
            <details>
              <summary className="min-h-11 cursor-pointer rounded-md px-2 py-2 text-sm">
                <span className="font-semibold">
                  {note.targetInstrumentSkillName ?? "Instrumen"}
                </span>
                {note.partLabel ? ` · dari ${note.partLabel}` : ""}
                {` — ${note.body.slice(0, 100)}${note.body.length > 100 ? "…" : ""}`}
              </summary>
              <InlineNoteThread
                note={note}
                songId={songId}
                eventSongId={eventSongId}
                sections={sections}
                canWrite={canWrite}
                canModerate={canModerate}
                currentUserId={currentUserId}
              />
            </details>
          </li>
        ))}
      </ul>
      {composer}
    </div>
  );
}

export function SectionGeneralNotePanel({
  songId,
  eventSongId,
  sectionId,
  notes,
  sections,
  defaultPart,
  canWrite,
  canModerate,
  currentUserId,
}: SectionAnnotationProps) {
  const general = notes.filter(
    (note) =>
      !note.parentId &&
      note.status === "OPEN" &&
      !note.targetInstrumentSkillId,
  );
  if (general.length === 0 && !canWrite) return null;
  const composer = canWrite ? (
    <details className="mt-2 border-t border-zinc-200 pt-1 dark:border-zinc-800">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">
        Tambah catatan umum
      </summary>
      <NoteComposer
        songId={songId}
        eventSongId={eventSongId}
        defaultPart={defaultPart}
        sectionId={sectionId}
        targetOptions={[]}
      />
    </details>
  ) : null;
  if (general.length === 0) {
    return (
      <details
        data-general-section-notes=""
        aria-label="Catatan untuk semua personel"
        className="min-w-0 rounded-lg border border-zinc-300 px-3 dark:border-zinc-700"
      >
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
          Semua personel
        </summary>
        {composer}
      </details>
    );
  }
  return (
    <aside
      data-general-section-notes=""
      aria-label="Catatan untuk semua personel"
      className="min-w-0 rounded-lg border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
    >
      <h4 className="font-semibold">Semua personel</h4>
      <ul className="mt-2 flex flex-col gap-2">
          {general.slice(0, 3).map((note) => (
            <li key={note.id}>
              <details>
                <summary className="min-h-11 cursor-pointer rounded-md bg-zinc-50 px-2 py-2 dark:bg-zinc-900">
                  <span className="font-medium">{note.authorName}</span>
                  {note.partLabel ? ` · ${note.partLabel}` : ""}
                  <span className="mt-1 block line-clamp-2 text-zinc-700 dark:text-zinc-300">
                    {note.body}
                  </span>
                </summary>
                <InlineNoteThread
                  note={note}
                  songId={songId}
                  eventSongId={eventSongId}
                  sections={sections}
                  canWrite={canWrite}
                  canModerate={canModerate}
                  currentUserId={currentUserId}
                />
              </details>
            </li>
          ))}
          {general.length > 3 ? (
            <li>
              <details>
                <summary className="min-h-11 cursor-pointer px-2 py-2 text-xs underline">
                  Tampilkan {general.length - 3} catatan lainnya
                </summary>
                <ul className="flex flex-col gap-2">
                  {general.slice(3).map((note) => (
                    <li key={note.id}>
                      <InlineNoteThread
                        note={note}
                        songId={songId}
                        eventSongId={eventSongId}
                        sections={sections}
                        canWrite={canWrite}
                        canModerate={canModerate}
                        currentUserId={currentUserId}
                      />
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ) : null}
      </ul>
      {composer}
    </aside>
  );
}

function InlineNoteThread({
  note,
  songId,
  eventSongId,
  sections,
  canWrite,
  canModerate,
  currentUserId,
}: {
  note: SongNoteView;
  songId: string;
  eventSongId: string;
  sections: NoteSectionOption[];
  canWrite: boolean;
  canModerate: boolean;
  currentUserId: string;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const canModify =
    canWrite && (canModerate || note.authorUserId === currentUserId);
  return (
    <NoteCard
      note={note}
      songId={songId}
      eventSongId={eventSongId}
      sections={sections}
      canWrite={canWrite}
      canModify={canModify}
      canReply={canWrite && note.status === "OPEN"}
      canModerate={canModerate}
      currentUserId={currentUserId}
      replying={replying}
      editing={editing}
      onReply={() => {
        setEditing(false);
        setReplying((value) => !value);
      }}
      onEdit={() => {
        setReplying(false);
        setEditing((value) => !value);
      }}
      onDone={() => {
        setReplying(false);
        setEditing(false);
      }}
    />
  );
}

function NoteCard({
  note,
  songId,
  eventSongId,
  sections,
  canWrite,
  canModify,
  canReply,
  canModerate,
  currentUserId,
  replying,
  editing,
  onReply,
  onEdit,
  onDone,
}: {
  note: SongNoteView;
  songId: string;
  eventSongId: string;
  sections: NoteSectionOption[];
  canWrite: boolean;
  canModify: boolean;
  canReply: boolean;
  canModerate: boolean;
  currentUserId: string;
  replying: boolean;
  editing: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDone: () => void;
}) {
  const isOwn = note.authorUserId === currentUserId;
  return (
    <article className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{note.authorName}</span>
        {note.partLabel ? <Badge tone="neutral">{note.partLabel}</Badge> : null}
        {note.targetInstrumentSkillName ? (
          <Badge tone="neutral">Untuk {note.targetInstrumentSkillName}</Badge>
        ) : null}
        <Badge tone={note.status === "RESOLVED" ? "success" : "warning"}>
          {NOTE_STATUS_LABEL[note.status]}
        </Badge>
        <span className="text-xs text-zinc-500">
          {note.sectionLabel ?? NO_SECTION_LABEL} · {formatJakarta(note.createdAt)}
          {note.editedAt ? ` · diedit ${formatJakarta(note.editedAt)}` : ""}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words">{note.body}</p>

      {canModify || canReply ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canReply ? (
            <Button type="button" variant="secondary" size="sm" onClick={onReply}>
              {replying ? "Tutup balasan" : "Balas"}
            </Button>
          ) : null}
          {canModify ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
                {editing ? "Tutup edit" : "Edit"}
              </Button>
              <ResolveButton
                noteId={note.id}
                songId={songId}
                resolved={note.status === "RESOLVED"}
              />
              <DeleteButton
                noteId={note.id}
                songId={songId}
                isAdmin={canModerate && !isOwn}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <EditNoteForm
          note={note}
          songId={songId}
          sections={sections}
          onDone={onDone}
        />
      ) : null}

      {note.replies.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-800">
          {note.replies.map((reply) => {
            const replyCanModify =
                canWrite &&
                (canModerate || reply.authorUserId === currentUserId);
            return (
              <li key={reply.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{reply.authorName}</span>
                  {reply.partLabel ? (
                    <Badge tone="neutral">{reply.partLabel}</Badge>
                  ) : null}
                  <span className="text-xs text-zinc-500">
                    {formatJakarta(reply.createdAt)}
                    {reply.editedAt
                      ? ` · diedit ${formatJakarta(reply.editedAt)}`
                      : ""}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {reply.body}
                </p>
                {replyCanModify ? (
                  <ReplyOwnActions
                    reply={reply}
                    songId={songId}
                    sections={sections}
                    isAdmin={
                      canModerate && reply.authorUserId !== currentUserId
                    }
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {replying ? (
        <ReplyForm
          songId={songId}
          eventSongId={eventSongId}
          parentId={note.id}
          defaultPart={note.partLabel}
          targetInstrumentSkillId={note.targetInstrumentSkillId}
          onDone={onDone}
        />
      ) : null}
    </article>
  );
}

function ReplyOwnActions({
  reply,
  songId,
  sections,
  isAdmin,
}: {
  reply: SongNoteView;
  songId: string;
  sections: NoteSectionOption[];
  isAdmin: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setEditing((value) => !value)}
      >
        {editing ? "Tutup edit" : "Edit balasan"}
      </Button>
      <DeleteButton noteId={reply.id} songId={songId} isAdmin={isAdmin} />
      {editing ? (
        <div className="w-full">
          <EditNoteForm
            note={reply}
            songId={songId}
            sections={sections}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReplyForm({
  songId,
  eventSongId,
  parentId,
  defaultPart,
  targetInstrumentSkillId,
  onDone,
}: {
  songId: string;
  eventSongId: string;
  parentId: string;
  defaultPart: string | null;
  targetInstrumentSkillId: string | null;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    useCallback(
      async (prev: ActionState, formData: FormData) => {
        const result = await createSongNoteAction(prev, formData);
        if (result.ok) onDone();
        return result;
      },
      [onDone],
    ),
    { ok: false },
  );
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="eventSongId" value={eventSongId} />
      <input type="hidden" name="parentId" value={parentId} />
      {targetInstrumentSkillId ? (
        <input
          type="hidden"
          name="targetInstrumentSkillId"
          value={targetInstrumentSkillId}
        />
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Balasan
        <textarea
          name="body"
          rows={2}
          required
          minLength={2}
          maxLength={2000}
          placeholder="Tanggapi catatan ini…"
          className={textareaClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Part / instrumen
        <input
          name="partLabel"
          list="song-note-parts"
          maxLength={80}
          defaultValue={defaultPart ?? ""}
          placeholder="cth. Drum, Keyboard, Gitar"
          className={inputClass}
        />
      </label>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Mengirim…" : "Kirim balasan"}
        </Button>
      </div>
    </form>
  );
}

function EditNoteForm({
  note,
  songId,
  sections,
  onDone,
}: {
  note: SongNoteView;
  songId: string;
  sections: NoteSectionOption[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    useCallback(
      async (prev: ActionState, formData: FormData) => {
        const result = await updateSongNoteAction(prev, formData);
        if (result.ok) onDone();
        return result;
      },
      [onDone],
    ),
    { ok: false },
  );
  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <input type="hidden" name="noteId" value={note.id} />
      <input type="hidden" name="songId" value={songId} />
      {note.parentId ? null : (
        <label className="flex flex-col gap-1 text-sm font-medium">
          Bagian lagu
          <select
            name="sectionId"
            defaultValue={note.sectionId ?? ""}
            className={inputClass}
          >
            <option value="">{NO_SECTION_LABEL}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Part / instrumen
        <input
          name="partLabel"
          list="song-note-parts"
          maxLength={80}
          defaultValue={note.partLabel ?? ""}
          placeholder="cth. Drum, Keyboard, Gitar"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Catatan
        <textarea
          name="body"
          rows={3}
          required
          minLength={2}
          maxLength={2000}
          defaultValue={note.body}
          className={textareaClass}
        />
      </label>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}

function ResolveButton({
  noteId,
  songId,
  resolved,
}: {
  noteId: string;
  songId: string;
  resolved: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resolveSongNoteAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="resolved" value={resolved ? "false" : "true"} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {resolved ? "Buka lagi" : "Tandai selesai"}
      </Button>
      {!state.ok && state.error ? (
        <span className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

function DeleteButton({
  noteId,
  songId,
  isAdmin,
}: {
  noteId: string;
  songId: string;
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    deleteSongNoteAction,
    { ok: false },
  );
  function confirmSubmit(event: FormEvent<HTMLFormElement>) {
    const message = isAdmin
      ? "Hapus catatan milik personel ini? Tindakan admin dicatat di audit log."
      : "Hapus catatan ini beserta balasannya?";
    if (!window.confirm(message)) event.preventDefault();
  }
  return (
    <form action={formAction} onSubmit={confirmSubmit} className="flex flex-col gap-1">
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="songId" value={songId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "…" : "Hapus"}
      </Button>
      {!state.ok && state.error ? (
        <span className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

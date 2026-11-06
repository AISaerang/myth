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
  admin,
}: {
  songId: string;
  eventSongId: string;
  notes: SongNoteView[];
  sections: NoteSectionOption[];
  partOptions: string[];
  defaultPart: string | null;
  canWrite: boolean;
  currentUserId: string;
  admin: boolean;
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
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        Catatan per bagian lagu dari POV pemusik — misalnya pola ritme drum,
        layer keyboard, atau fingering gitar. Semua personel event bisa membaca;
        penulis dan MD bisa menandai selesai.
      </p>

      <datalist id="song-note-parts">
        {parts.map((part) => (
          <option key={part} value={part} />
        ))}
      </datalist>

      {canWrite ? (
        <NoteComposer
          songId={songId}
          eventSongId={eventSongId}
          sections={sections}
          defaultPart={defaultPart}
        />
      ) : (
        <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Mode baca. Membuat catatan tersedia untuk personel event pada lagu
          yang sudah dipublish.
        </p>
      )}

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
          Part
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
              ? "Mulai dari bagian yang sedang kamu latih — tulis pola atau arahan part-mu."
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((note) => {
            const canModify =
              canWrite && (admin || note.authorUserId === currentUserId);
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
                  admin={admin}
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
    </Card>
  );
}

function NoteComposer({
  songId,
  eventSongId,
  sections,
  defaultPart,
}: {
  songId: string;
  eventSongId: string;
  sections: NoteSectionOption[];
  defaultPart: string | null;
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Bagian lagu
          <select name="sectionId" defaultValue="" className={inputClass}>
            <option value="">{NO_SECTION_LABEL}</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
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

function NoteCard({
  note,
  songId,
  eventSongId,
  sections,
  canWrite,
  canModify,
  canReply,
  admin,
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
  admin: boolean;
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
                isAdmin={admin && !isOwn}
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
              canWrite && (admin || reply.authorUserId === currentUserId);
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
                    isAdmin={admin && reply.authorUserId !== currentUserId}
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
  onDone,
}: {
  songId: string;
  eventSongId: string;
  parentId: string;
  defaultPart: string | null;
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

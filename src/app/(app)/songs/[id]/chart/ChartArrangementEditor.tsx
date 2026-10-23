"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  CHART_SECTION_TYPE_HINT,
  CHART_SECTION_TYPE_LABEL,
  composeArrangementContent,
  type ChartSectionKind,
} from "@/lib/chart-arrangement";
import {
  activateChartArrangementAction,
  createChartArrangementAction,
  deleteChartArrangementAction,
  deleteChartSectionAction,
  importLegacyChartAction,
  saveChartArrangementItemsAction,
  updateChartArrangementAction,
} from "@server/actions/chart-arrangements";
import { ChordViewer } from "../ChordViewer";
import { ChartSectionEditor, type SectionData } from "./ChartSectionEditor";
import { HintSelect } from "@/components/ui/HintSelect";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export interface EditorSection {
  id: string;
  type: ChartSectionKind;
  label: string;
  content: string;
  sortOrder: number;
}

export interface EditorItem {
  id: string;
  sectionId: string;
  labelOverride: string | null;
  section: EditorSection;
}

export interface EditorArrangement {
  id: string;
  name: string;
  isActive: boolean;
  items: EditorItem[];
}

interface DraftItem {
  key: string;
  sectionId: string;
  labelOverride: string;
}

function toDraft(arrangement: EditorArrangement | null): DraftItem[] {
  return (
    arrangement?.items.map((item) => ({
      key: item.id,
      sectionId: item.sectionId,
      labelOverride: item.labelOverride ?? "",
    })) ?? []
  );
}

export function ChartArrangementEditor({
  songId,
  sections,
  arrangements,
  initialArrangementId,
  legacyChart,
}: {
  songId: string;
  sections: EditorSection[];
  arrangements: EditorArrangement[];
  initialArrangementId?: string;
  legacyChart: { label: string | null } | null;
}) {
  const firstArrangementId =
    arrangements.find((a) => a.id === initialArrangementId)?.id ??
    arrangements.find((a) => a.isActive)?.id ??
    arrangements[0]?.id ??
    "";
  const [selectedId, setSelectedId] = useState(firstArrangementId);
  const selected =
    arrangements.find((arrangement) => arrangement.id === selectedId) ??
    arrangements.find((arrangement) => arrangement.isActive) ??
    arrangements[0] ??
    null;
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const masterSectionRef = useRef<HTMLDivElement>(null);

  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );
  const editingSection = editingSectionId
    ? sections.find((section) => section.id === editingSectionId)
    : undefined;

  function selectArrangement(arrangement: EditorArrangement) {
    setSelectedId(arrangement.id);
    setEditingSectionId(null);
    setCreatingSection(false);
  }

  function handleRequestNewSection() {
    setCreatingSection(true);
    setEditingSectionId(null);
    requestAnimationFrame(() => {
      masterSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Aransemen">
        <div className="flex flex-col gap-3">
          {arrangements.length > 0 ? (
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Pilih aransemen">
              {arrangements.map((arrangement) => (
                <button
                  key={arrangement.id}
                  type="button"
                  role="tab"
                  aria-selected={arrangement.id === selected?.id}
                  onClick={() => selectArrangement(arrangement)}
                  className={`min-h-[44px] rounded-lg px-3 text-sm font-medium ${
                    arrangement.id === selected?.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 dark:border-zinc-700"
                  }`}
                >
                  {arrangement.name}
                  {arrangement.isActive ? " · aktif" : ""}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Belum ada aransemen. Buat satu, lalu susun bagian-bagiannya.
            </p>
          )}

          <ArrangementCreateForm songId={songId} />

          {selected ? (
            <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                {selected.isActive ? (
                  <Badge tone="success">Aransemen aktif</Badge>
                ) : (
                  <ArrangementActivateButton
                    songId={songId}
                    arrangementId={selected.id}
                  />
                )}
                <ArrangementDeleteButton
                  songId={songId}
                  arrangementId={selected.id}
                  name={selected.name}
                  isActive={selected.isActive}
                />
              </div>
              <ArrangementRenameForm
                songId={songId}
                arrangementId={selected.id}
                name={selected.name}
              />
            </div>
          ) : null}

          {arrangements.length === 0 && sections.length === 0 && legacyChart ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
              <p className="font-medium">Import chart lama</p>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Chart aktif {legacyChart.label ? `"${legacyChart.label}" ` : ""}
                akan dipecah otomatis berdasarkan label {"{Verse}"},{" "}
                {"{Chorus}"}, dan seterusnya.
              </p>
              <div className="mt-2">
                <ImportLegacyForm songId={songId} />
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {selected ? (
        <ArrangementWorkspace
          key={selected.id}
          songId={songId}
          arrangement={selected}
          sections={sections}
          sectionMap={sectionMap}
          onRequestNewSection={handleRequestNewSection}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Susunan aransemen">
            <EmptyState
              title="Pilih atau buat aransemen"
              description="Aransemen menentukan urutan bagian yang tampil."
            />
          </Card>
          <Card title="Tampilan akhir">
            <EmptyState
              title="Belum ada isi"
              description="Tambahkan bagian untuk melihat tampilan akhir."
            />
          </Card>
        </div>
      )}

      <div ref={masterSectionRef}>
        <Card title="Master bagian">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Bagian dipakai bersama oleh semua aransemen. Edit sekali, semua
              aransemen ikut berubah.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setCreatingSection((value) => !value);
                setEditingSectionId(null);
              }}
            >
              {creatingSection ? "Tutup form" : "Tambah bagian"}
            </Button>
          </div>

          {creatingSection ? (
            <ChartSectionEditor
              key="new"
              songId={songId}
              onDone={() => setCreatingSection(false)}
            />
          ) : null}

          {editingSection ? (
            <ChartSectionEditor
              key={editingSection.id}
              songId={songId}
              section={editingSection as SectionData}
              onDone={() => setEditingSectionId(null)}
            />
          ) : null}

          {sections.length === 0 ? (
            <EmptyState
              title="Belum ada bagian"
              description="Tambahkan Verse, Chorus, Bridge, dan bagian lain di sini."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {sections.map((section) => (
                <li
                  key={section.id}
                  className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {section.label}{" "}
                        <span className="text-xs font-normal text-zinc-500">
                          · {CHART_SECTION_TYPE_LABEL[section.type]}
                        </span>
                      </p>
                      <p className="line-clamp-2 text-xs text-zinc-500">
                        {section.content}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingSectionId(section.id);
                          setCreatingSection(false);
                        }}
                      >
                        Edit
                      </Button>
                      <SectionDeleteButton
                        songId={songId}
                        sectionId={section.id}
                        label={section.label}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </Card>
      </div>
    </div>
  );
}

function ArrangementWorkspace({
  songId,
  arrangement,
  sections,
  sectionMap,
  onRequestNewSection,
}: {
  songId: string;
  arrangement: EditorArrangement;
  sections: EditorSection[];
  sectionMap: Map<string, EditorSection>;
  onRequestNewSection: () => void;
}) {
  const [draft, setDraft] = useState<DraftItem[]>(() =>
    toDraft(arrangement),
  );
  const [dirty, setDirty] = useState(false);
  const keyCounter = useRef(0);

  const previewContent = useMemo(
    () =>
      composeArrangementContent(
        draft.flatMap((item) => {
          const section = sectionMap.get(item.sectionId);
          return section
            ? [{ section, labelOverride: item.labelOverride }]
            : [];
        }),
      ),
    [draft, sectionMap],
  );

  const handleSaved = useCallback(() => setDirty(false), []);

  function updateDraft(next: DraftItem[]) {
    setDraft(next);
    setDirty(true);
  }

  function addSection(sectionId: string) {
    if (!sectionId) return;
    keyCounter.current += 1;
    updateDraft([
      ...draft,
      { key: `new-${keyCounter.current}`, sectionId, labelOverride: "" },
    ]);
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    updateDraft(next);
  }

  function duplicateItem(index: number) {
    const item = draft[index];
    if (!item) return;
    keyCounter.current += 1;
    const next = [...draft];
    next.splice(index + 1, 0, {
      ...item,
      key: `new-${keyCounter.current}`,
    });
    updateDraft(next);
  }

  function removeItem(index: number) {
    updateDraft(draft.filter((_, i) => i !== index));
  }

  function setOverride(index: number, value: string) {
    updateDraft(
      draft.map((item, i) =>
        i === index ? { ...item, labelOverride: value } : item,
      ),
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Susunan aransemen">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <label
              htmlFor={`add-section-${arrangement.id}`}
              className="sr-only"
            >
              Tambah bagian
            </label>
            <HintSelect
              id={`add-section-${arrangement.id}`}
              className="min-w-0 flex-1"
              placeholder="Tambah bagian…"
              ariaLabel="Tambah bagian ke aransemen"
              value=""
              onChange={(value) => {
                if (value === "__new__") {
                  onRequestNewSection();
                } else {
                  addSection(value);
                }
              }}
              items={[
                {
                  value: "__new__",
                  label: "+ Bagian baru…",
                  hint: "Buat bagian baru di kartu Master bagian.",
                },
                ...sections.map((section) => ({
                  value: section.id,
                  label: `${section.label} · ${CHART_SECTION_TYPE_LABEL[section.type]}`,
                  hint: CHART_SECTION_TYPE_HINT[section.type],
                  group: "Bagian yang sudah ada",
                })),
              ]}
            />
          </div>

          {draft.length === 0 ? (
            <EmptyState
              title="Susunan masih kosong"
              description="Tambahkan bagian dari dropdown di atas."
            />
          ) : (
            <ol className="flex flex-col gap-2">
              {draft.map((item, index) => {
                const section = sectionMap.get(item.sectionId);
                if (!section) return null;
                return (
                  <li
                    key={item.key}
                    className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {index + 1}. {section.label}{" "}
                          <span className="text-xs font-normal text-zinc-500">
                            · {CHART_SECTION_TYPE_LABEL[section.type]}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveItem(index, -1)}
                          aria-label={`Naikkan ${section.label}`}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={index === draft.length - 1}
                          onClick={() => moveItem(index, 1)}
                          aria-label={`Turunkan ${section.label}`}
                        >
                          ↓
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => duplicateItem(index)}
                        >
                          Duplikat
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                    <label
                      htmlFor={`override-${item.key}`}
                      className="mt-2 block text-xs text-zinc-500"
                    >
                      Label tampil (opsional)
                    </label>
                    <input
                      id={`override-${item.key}`}
                      value={item.labelOverride}
                      maxLength={50}
                      onChange={(event) =>
                        setOverride(index, event.target.value)
                      }
                      placeholder={section.label}
                      className={`${inputClass} mt-1 w-full`}
                    />
                  </li>
                );
              })}
            </ol>
          )}

          <SaveArrangementForm
            songId={songId}
            arrangementId={arrangement.id}
            draft={draft}
            dirty={dirty}
            onSaved={handleSaved}
          />
        </div>
      </Card>

      <Card title="Tampilan akhir">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">
            Preview mengikuti draft susunan. Simpan urutan untuk menerapkan.
          </p>
          {previewContent ? (
            <ChordViewer content={previewContent} baseKey="C" />
          ) : (
            <EmptyState
              title="Belum ada isi"
              description="Tambahkan bagian untuk melihat tampilan akhir."
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function ArrangementCreateForm({ songId }: { songId: string }) {
  const [state, formAction, pending] = useActionState(
    createChartArrangementAction,
    { ok: false },
  );
  return (
    <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <summary className="cursor-pointer text-sm font-medium">
        Buat aransemen baru
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="songId" value={songId} />
        <label htmlFor="new-arrangement-name" className="text-sm font-medium">
          Nama aransemen
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="new-arrangement-name"
            name="name"
            required
            maxLength={60}
            placeholder="cth. Aransemen Manggung"
            className={`${inputClass} min-w-0 flex-1`}
          />
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {pending ? "…" : "Buat"}
          </Button>
        </div>
        {!state.ok && state.error ? (
          <Alert tone="danger">{state.error}</Alert>
        ) : null}
      </form>
    </details>
  );
}

function ArrangementRenameForm({
  songId,
  arrangementId,
  name,
}: {
  songId: string;
  arrangementId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateChartArrangementAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="arrangementId" value={arrangementId} />
      <label htmlFor="rename-arrangement" className="text-sm font-medium">
        Nama aransemen
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          key={arrangementId}
          id="rename-arrangement"
          name="name"
          required
          maxLength={60}
          defaultValue={name}
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "…" : "Ganti nama"}
        </Button>
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok ? <Alert tone="info">Nama aransemen diperbarui.</Alert> : null}
    </form>
  );
}

function ArrangementActivateButton({
  songId,
  arrangementId,
}: {
  songId: string;
  arrangementId: string;
}) {
  const [state, formAction, pending] = useActionState(
    activateChartArrangementAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="arrangementId" value={arrangementId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Jadikan aktif"}
      </Button>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </form>
  );
}

function ArrangementDeleteButton({
  songId,
  arrangementId,
  name,
  isActive,
}: {
  songId: string;
  arrangementId: string;
  name: string;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteChartArrangementAction,
    { ok: false },
  );
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus aransemen "${name}"?`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="arrangementId" value={arrangementId} />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        disabled={pending || isActive}
        title={isActive ? "Aktifkan aransemen lain dulu." : undefined}
      >
        {pending ? "…" : "Hapus aransemen"}
      </Button>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </form>
  );
}

function SaveArrangementForm({
  songId,
  arrangementId,
  draft,
  dirty,
  onSaved,
}: {
  songId: string;
  arrangementId: string;
  draft: DraftItem[];
  dirty: boolean;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    saveChartArrangementItemsAction,
    { ok: false },
  );
  useEffect(() => {
    if (state.ok) onSaved();
  }, [state, onSaved]);

  const items = JSON.stringify(
    draft.map((item) => ({
      sectionId: item.sectionId,
      labelOverride: item.labelOverride.trim() || null,
    })),
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="arrangementId" value={arrangementId} />
      <input type="hidden" name="items" value={items} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending || draft.length === 0}
        >
          {pending ? "Menyimpan…" : "Simpan urutan"}
        </Button>
        {dirty ? (
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Ada perubahan belum disimpan
          </span>
        ) : null}
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      {state.ok && !dirty ? (
        <Alert tone="info">Urutan aransemen tersimpan.</Alert>
      ) : null}
    </form>
  );
}

function SectionDeleteButton({
  songId,
  sectionId,
  label,
}: {
  songId: string;
  sectionId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(
    deleteChartSectionAction,
    { ok: false },
  );
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus bagian "${label}"?`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="songId" value={songId} />
      <input type="hidden" name="sectionId" value={sectionId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "…" : "Hapus"}
      </Button>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </form>
  );
}

function ImportLegacyForm({ songId }: { songId: string }) {
  const [state, formAction, pending] = useActionState(
    importLegacyChartAction,
    { ok: false },
  );
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="songId" value={songId} />
      <label htmlFor="import-name" className="text-sm font-medium">
        Nama aransemen hasil import (opsional)
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="import-name"
          name="name"
          maxLength={60}
          placeholder="Aransemen Utama"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Mengimpor…" : "Import chart lama"}
        </Button>
      </div>
      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
    </form>
  );
}

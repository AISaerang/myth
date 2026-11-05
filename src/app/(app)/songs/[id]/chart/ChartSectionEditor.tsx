"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  CHART_SECTION_TYPES,
  CHART_SECTION_TYPE_HINT,
  CHART_SECTION_TYPE_LABEL,
  type ChartSectionKind,
} from "@/lib/chart-arrangement";
import {
  createChartSectionAction,
  updateChartSectionAction,
} from "@server/actions/chart-arrangements";
import { HintSelect } from "@/components/ui/HintSelect";
import { ChordOverUnderEditor } from "../ChordOverUnderEditor";
import { ChordViewer } from "../ChordViewer";

const inputClass =
  "h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export interface SectionData {
  id: string;
  type: ChartSectionKind;
  label: string;
  content: string;
}

export function ChartSectionEditor({
  songId,
  section,
  onDone,
}: {
  songId: string;
  section?: SectionData;
  onDone: () => void;
}) {
  const [type, setType] = useState<ChartSectionKind>(section?.type ?? "VERSE");
  const [label, setLabel] = useState(section?.label ?? "");
  const [content, setContent] = useState(section?.content ?? "");
  const [state, formAction, pending] = useActionState(
    section ? updateChartSectionAction : createChartSectionAction,
    { ok: false },
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      // Ambil ulang data server supaya daftar bagian/ChordBody langsung
      // menampilkan isi terbaru (mencegah "beda dari preview saat simpan").
      router.refresh();
      onDone();
    }
  }, [state.ok, onDone, router]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-sky-300 bg-sky-50/60 p-4 dark:border-sky-800 dark:bg-sky-950/30"
    >
      <input type="hidden" name="songId" value={songId} />
      {section ? (
        <input type="hidden" name="sectionId" value={section.id} />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor="section-type" className="text-sm font-medium">
            Tipe bagian
          </label>
          <input type="hidden" name="type" value={type} />
          <HintSelect
            id="section-type"
            items={CHART_SECTION_TYPES.map((value) => ({
              value,
              label: CHART_SECTION_TYPE_LABEL[value],
              hint: CHART_SECTION_TYPE_HINT[value],
            }))}
            value={type}
            onChange={(next) => setType(next as ChartSectionKind)}
            ariaLabel="Tipe bagian"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="section-label" className="text-sm font-medium">
            Label bagian
          </label>
          <input
            id="section-label"
            name="label"
            required
            maxLength={50}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="cth. Verse 1, Chorus, Bridge"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <ChordOverUnderEditor
            id="section-content"
            name="content"
            heading={
              type === "INTRO" ? "Kunci & not angka — basis C" : "Kunci & lirik — basis C"
            }
            defaultValue={section?.content ?? ""}
            rows={16}
            onChange={setContent}
            placeholder={type === "INTRO" ? "C   G\n1' 2 3 .6 5,  [5 6]" : undefined}
            hint={
              type === "INTRO"
                ? "Kunci di baris atas, not angka di bawah. ' titik di atas angka; , atau .6 titik di bawah (beberapa tanda = beberapa titik). #4 garis / menembus angka, b7 garis \\. [5 6] satu garis di atas, [[5 6]] dua garis, (5 6) busur. / ketukan, - tahan, | birama. Spasi menentukan kolom. Transpose menggeser kunci saja."
                : section
                  ? "Kunci di baris atas, lirik di baris bawah; atur posisi pakai spasi atau Tab."
                  : undefined
            }
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Preview tampilan akhir</p>
          {content.trim() ? (
            <ChordViewer content={content} baseKey="C" />
          ) : (
            <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
              Preview muncul saat konten diisi.
            </p>
          )}
        </div>
      </div>

      {!state.ok && state.error ? (
        <Alert tone="danger">{state.error}</Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending
            ? "Menyimpan…"
            : section
              ? "Simpan bagian"
              : "Tambah bagian"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>
          Batal
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  instrumentOverrideSchema,
  type InstrumentChartData,
} from "@/lib/validation/instrument-chart";
import { listChords } from "@/lib/chords";
import { saveInstrumentChartAction } from "@server/actions/instrument-chart";
import type { ActionState } from "@server/actions/auth";

const inputClass =
  "h-11 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const DYNAMICS = [
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
  "cresc.",
  "decresc.",
  "rit.",
] as const;

export interface InstrumentEditorSection {
  id: string;
  label: string;
  content: string;
}

export function InstrumentChartEditor({
  songId,
  arrangementId,
  eventId,
  sections,
  initialCapo,
  initialData,
}: {
  songId: string;
  arrangementId: string;
  eventId?: string;
  sections: InstrumentEditorSection[];
  initialCapo: number;
  initialData: InstrumentChartData;
}) {
  const chords = useMemo(
    () => [...new Set(sections.flatMap((section) => listChords(section.content)))],
    [sections],
  );
  const [capo, setCapo] = useState(initialCapo);
  const [data, setData] = useState(initialData);
  const [voicingText, setVoicingText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      chords.map((chord) => [
        chord,
        initialData.voicings[chord]
          ? JSON.stringify(initialData.voicings[chord], null, 2)
          : "",
      ]),
    ),
  );
  const [jsonError, setJsonError] = useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveInstrumentChartAction,
    { ok: false },
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  function updateSection(
    sectionId: string,
    patch: Partial<NonNullable<InstrumentChartData["sections"][string]>>,
  ) {
    setData((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [sectionId]: {
          ...current.sections[sectionId],
          ...patch,
        },
      },
    }));
  }

  function updateVoicing(chord: string, value: string) {
    setVoicingText((current) => ({ ...current, [chord]: value }));
    if (!value.trim()) {
      setData((current) => {
        const voicings = { ...current.voicings };
        delete voicings[chord];
        return { ...current, voicings };
      });
      setJsonError("");
      return;
    }
    try {
      const parsed = instrumentOverrideSchema.safeParse(JSON.parse(value));
      if (!parsed.success) {
        setJsonError(`Override ${chord}: ${parsed.error.issues[0]?.message ?? "format tidak valid."}`);
        return;
      }
      setData((current) => ({
        ...current,
        voicings: { ...current.voicings, [chord]: parsed.data },
      }));
      setJsonError("");
    } catch {
      setJsonError(`Override ${chord}: JSON tidak valid.`);
    }
  }

  return (
    <section
      id="instrument-chart"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <h2 className="text-lg font-semibold">Data instrumen</h2>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          Data instrumen dan tab peran milik aransemen yang dipilih. Pemilihan aransemen dapat berbeda antar event.
        </p>
      </div>
      <form action={formAction} className="flex min-w-0 flex-col gap-4">
        <input type="hidden" name="songId" value={songId} />
        <input type="hidden" name="arrangementId" value={arrangementId} />
        {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
        <input type="hidden" name="capo" value={capo} />
        <input type="hidden" name="data" value={JSON.stringify(data)} />

        <label className="flex max-w-xs flex-col gap-1 text-sm font-medium">
          Capo default
          <select
            value={capo}
            onChange={(event) => setCapo(Number(event.target.value))}
            className={inputClass}
          >
            {Array.from({ length: 12 }, (_, value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3">
          <h3 className="font-medium">Dinamika dan pola per bagian</h3>
          {sections.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Tambahkan bagian chart sebelum mengatur dinamika dan pola.
            </p>
          ) : null}
          {sections.map((section) => {
            const metadata = data.sections[section.id] ?? {};
            return (
              <fieldset
                key={section.id}
                className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-2 dark:border-zinc-800"
              >
                <legend className="px-1 text-sm font-medium">{section.label}</legend>
                <label className="flex flex-col gap-1 text-xs">
                  Dinamika
                  <select
                    value={metadata.dynamic ?? ""}
                    onChange={(event) => {
                      const dynamic = DYNAMICS.find(
                        (value) => value === event.target.value,
                      );
                      updateSection(section.id, { dynamic });
                    }}
                    className={inputClass}
                  >
                    <option value="">Tidak ada</option>
                    {DYNAMICS.map((dynamic) => (
                      <option key={dynamic} value={dynamic}>{dynamic}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Birama bagian
                  <input
                    value={metadata.rhythm?.meter ?? ""}
                    maxLength={8}
                    onChange={(event) =>
                      updateSection(section.id, {
                        rhythm: {
                          ...metadata.rhythm,
                          meter: event.target.value,
                        },
                      })
                    }
                    className={inputClass}
                    placeholder="contoh 6/8"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Pola gitar
                  <input
                    value={metadata.rhythm?.guitar ?? ""}
                    maxLength={80}
                    onChange={(event) =>
                      updateSection(section.id, {
                        rhythm: {
                          ...metadata.rhythm,
                          guitar: event.target.value,
                        },
                      })
                    }
                    className={inputClass}
                    placeholder="contoh D - d u D u"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  Pola piano
                  <input
                    value={metadata.rhythm?.piano ?? ""}
                    maxLength={80}
                    onChange={(event) =>
                      updateSection(section.id, {
                        rhythm: {
                          ...metadata.rhythm,
                          piano: event.target.value,
                        },
                      })
                    }
                    className={inputClass}
                    placeholder="contoh LH root on beats 1 and 3"
                  />
                </label>
              </fieldset>
            );
          })}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="font-medium">Override voicing</h3>
          <p className="text-xs text-zinc-500">
            Kosongkan untuk memakai dictionary. Override berupa JSON sesuai bentuk
            guitar/piano yang sudah tervalidasi.
          </p>
          {chords.length === 0 ? (
            <p className="text-sm text-zinc-500">Belum ada simbol chord di bagian lagu.</p>
          ) : null}
          {chords.map((chord) => (
            <label key={chord} className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="font-medium">{chord}</span>
              <textarea
                value={voicingText[chord] ?? ""}
                onChange={(event) => updateVoicing(chord, event.target.value)}
                rows={7}
                maxLength={4000}
                className={`${inputClass} h-auto py-2 font-mono text-xs`}
                placeholder={`{
  "guitar": { "frets": ["x",0,2,2,1,0], "fingers": [0,0,2,3,1,0], "barre": null, "baseFret": 1 },
  "piano": { "lh": ["A2","E3"], "rh": ["C4","E4","A4"] }
}`}
              />
            </label>
          ))}
        </div>

        {jsonError ? <Alert tone="danger">{jsonError}</Alert> : null}
        {!state.ok && state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.ok ? <Alert tone="info">Data instrumen tersimpan.</Alert> : null}
        <Button type="submit" variant="secondary" disabled={pending || Boolean(jsonError)}>
          {pending ? "Menyimpan…" : "Simpan data instrumen"}
        </Button>
      </form>
    </section>
  );
}

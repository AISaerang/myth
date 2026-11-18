// Salin kolom intro lama (introChords / introNotation / introNote) menjadi
// bagian master bertipe INTRO. Kolom DB tidak dihapus; skrip hanya menulis
// ChartSection + item aransemen aktif bila bagian Intro belum ada.

import { makeUniqueSectionLabel } from "@/lib/chart-arrangement";
import { overUnderToChordPro } from "@/lib/chords";

export const PROD_DB_USER_PREFIX = "rGq";

export interface DatabaseTarget {
  host: string;
  userPrefix: string;
}

export interface IntroFields {
  introChords: string | null;
  introNotation: string | null;
  introNote: string | null;
}

export interface IntroSectionRef {
  type: string;
  label: string;
}

export type IntroMigrationPlan =
  | { action: "skip-empty" }
  | { action: "skip-existing" }
  | {
      action: "create";
      label: string;
      content: string;
      /** Nama aransemen aktif, atau null bila tidak ada yang bisa disisipi. */
      activeArrangementName: string | null;
    };

export function databaseTargetFromUrl(raw: string | undefined): DatabaseTarget {
  const value = raw?.trim() ?? "";
  if (!value) {
    throw new Error("DATABASE_URL kosong. Tidak ada host atau user DB untuk dilaporkan.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL tidak valid. Host dan user DB tidak bisa dibaca.");
  }
  const user = decodeURIComponent(url.username);
  return {
    host: url.hostname,
    userPrefix: user.slice(0, PROD_DB_USER_PREFIX.length),
  };
}

/** Tolak --apply bila prefix user DB produksi, kecuali --allow-prod. Dry-run tetap boleh. */
export function introApplyIsBlocked(
  userPrefix: string,
  options: { apply: boolean; allowProd: boolean },
): boolean {
  if (!options.apply || options.allowProd) return false;
  return userPrefix === PROD_DB_USER_PREFIX;
}

function normalizeField(value: string | null | undefined): string {
  return (value ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
}

export function hasIntroMusicalSource(fields: IntroFields): boolean {
  const chords = normalizeField(fields.introChords).trim();
  const notation = normalizeField(fields.introNotation).trim();
  return chords.length > 0 || notation.length > 0;
}

function commentLines(note: string): string {
  return note
    .split("\n")
    .map((line) => `# ${line.trim()}`)
    .join("\n");
}

/**
 * Kunci di baris atas, not angka di bawah, disimpan sebagai ChordPro.
 * introNote menjadi baris komentar `# ...` di bawah notasi.
 */
export function buildIntroSectionContent(fields: IntroFields): string {
  const chords = normalizeField(fields.introChords).replace(/^\n+|\n+$/g, "");
  const notation = normalizeField(fields.introNotation).replace(/^\n+|\n+$/g, "");
  const note = normalizeField(fields.introNote).trim();

  let body = "";
  if (chords.trim() && notation.trim()) {
    const chordLines = chords.split("\n");
    const notationLines = notation.split("\n");
    const rows = Math.max(chordLines.length, notationLines.length);
    const editor: string[] = [];
    for (let i = 0; i < rows; i += 1) {
      const chordLine = chordLines[i];
      const notationLine = notationLines[i];
      if (chordLine !== undefined && notationLine !== undefined) {
        editor.push(chordLine, notationLine);
      } else if (chordLine !== undefined) {
        editor.push(chordLine);
      } else if (notationLine !== undefined) {
        editor.push(notationLine);
      }
    }
    body = overUnderToChordPro(editor.join("\n"));
  } else if (notation.trim()) {
    body = notation;
  } else if (chords.trim()) {
    body = overUnderToChordPro(chords);
  }

  if (note) {
    const comments = commentLines(note);
    body = body ? `${body}\n${comments}` : comments;
  }
  return body.trim();
}

export function planIntroMigration(input: {
  fields: IntroFields;
  sections: IntroSectionRef[];
  activeArrangementName: string | null;
}): IntroMigrationPlan {
  if (!hasIntroMusicalSource(input.fields)) return { action: "skip-empty" };
  if (input.sections.some((section) => section.type === "INTRO")) {
    return { action: "skip-existing" };
  }
  const content = buildIntroSectionContent(input.fields);
  if (!content) return { action: "skip-empty" };
  const label = makeUniqueSectionLabel(
    "Intro",
    new Set(input.sections.map((section) => section.label)),
  );
  return {
    action: "create",
    label,
    content,
    activeArrangementName: input.activeArrangementName,
  };
}

// Bagian lagu (master) + aransemen sequence, gaya ProPresenter.
// Konten tiap bagian tetap ChordPro inline basis C; aransemen hanya mengatur
// urutan dan repeat bagian saat ditampilkan.

export const CHART_SECTION_TYPES = [
  "INTRO",
  "VERSE",
  "PRE_CHORUS",
  "CHORUS",
  "BRIDGE",
  "INTERLUDE",
  "INSTRUMENTAL",
  "TAG",
  "ENDING",
  "CODA",
  "OTHER",
] as const;

export type ChartSectionKind = (typeof CHART_SECTION_TYPES)[number];

export const CHART_SECTION_TYPE_LABEL: Record<ChartSectionKind, string> = {
  INTRO: "Intro",
  VERSE: "Verse",
  PRE_CHORUS: "Pre-Chorus",
  CHORUS: "Chorus / Reff",
  BRIDGE: "Bridge",
  INTERLUDE: "Interlude",
  INSTRUMENTAL: "Instrumental",
  TAG: "Tag / Tagline",
  ENDING: "Ending / Outro",
  CODA: "Coda",
  OTHER: "Lainnya",
};

export interface ParsedChartSection {
  label: string;
  type: ChartSectionKind;
  content: string;
}

export interface ComposeItem {
  labelOverride?: string | null;
  section: {
    label: string;
    content: string;
  };
}

const TYPE_PATTERNS: { pattern: RegExp; type: ChartSectionKind }[] = [
  { pattern: /^(intro|opening)\b/i, type: "INTRO" },
  { pattern: /^(pre[- ]?chorus|prechorus)\b/i, type: "PRE_CHORUS" },
  { pattern: /^(chorus|reff|refrain)\b/i, type: "CHORUS" },
  { pattern: /^(bridge)\b/i, type: "BRIDGE" },
  { pattern: /^(interlude)\b/i, type: "INTERLUDE" },
  { pattern: /^(instrumental|instrument)\b/i, type: "INSTRUMENTAL" },
  { pattern: /^(tag|tagline)\b/i, type: "TAG" },
  { pattern: /^(ending|outro|penutup)\b/i, type: "ENDING" },
  { pattern: /^(coda)\b/i, type: "CODA" },
  { pattern: /^(verse|bait)\b/i, type: "VERSE" },
];

export function inferSectionType(label: string): ChartSectionKind {
  const match = TYPE_PATTERNS.find((entry) => entry.pattern.test(label.trim()));
  return match?.type ?? "OTHER";
}

// Pecah chart ChordPro lama berdasarkan baris label {Verse}/{Chorus}/dll.
// Konten tanpa label tetap menjadi satu bagian agar tidak hilang.
export function parseLegacyChart(content: string): ParsedChartSection[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const sections: ParsedChartSection[] = [];
  let currentLabel: string | null = null;
  let currentLines: string[] = [];
  let unlabeled = 0;

  const flush = () => {
    const body = currentLines.join("\n").trim();
    currentLines = [];
    if (!body) return;
    const label = currentLabel?.trim() || `Bagian ${++unlabeled}`;
    sections.push({
      label,
      type: inferSectionType(label),
      content: body,
    });
  };

  for (const line of lines) {
    const labelMatch = /^\s*\{([^}]+)\}\s*$/.exec(line);
    if (labelMatch) {
      flush();
      currentLabel = (labelMatch[1] as string).trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

// Susun bagian sesuai urutan aransemen menjadi ChordPro untuk viewer.
// Setiap item diberi header {Label}; label override dipakai jika diisi.
export function composeArrangementContent(items: ComposeItem[]): string {
  return items
    .map((item) => {
      const label = (item.labelOverride?.trim() || item.section.label).trim();
      const content = item.section.content.trim();
      if (!content) return "";
      return label ? `{${label}}\n${content}` : content;
    })
    .filter(Boolean)
    .join("\n\n");
}

// Label bagian unik per lagu; dipakai saat import agar tidak bentrok.
export function makeUniqueSectionLabel(
  base: string,
  used: Set<string>,
): string {
  const clean = (base.trim() || "Bagian").slice(0, 50);
  if (!used.has(clean)) return clean;
  const prefix = clean.slice(0, 44).trimEnd();
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${prefix} (${i})`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix} (${used.size + 1})`;
}

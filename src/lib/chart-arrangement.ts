// Bagian lagu (master) + aransemen sequence, gaya ProPresenter.
// Konten tiap bagian tetap ChordPro inline basis C; aransemen hanya mengatur
// urutan dan repeat bagian saat ditampilkan.

export const CHART_SECTION_TYPES = [
  "INTRO",
  "VERSE",
  "PRE_CHORUS",
  "CHORUS",
  "POST_CHORUS",
  "PRE_BRIDGE",
  "BRIDGE",
  "INTERLUDE",
  "INSTRUMENTAL",
  "SOLO",
  "HOOK",
  "BREAKDOWN",
  "VAMP",
  "TAG",
  "TURNAROUND",
  "KEY_CHANGE",
  "ADLIB",
  "SPOKEN",
  "TRANSITION",
  "REPRISE",
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
  POST_CHORUS: "Post-Chorus",
  PRE_BRIDGE: "Pre-Bridge",
  BRIDGE: "Bridge",
  INTERLUDE: "Interlude",
  INSTRUMENTAL: "Instrumental",
  SOLO: "Solo",
  HOOK: "Hook / Riff",
  BREAKDOWN: "Breakdown / Break",
  VAMP: "Vamp / Loop",
  TAG: "Tag / Tagline",
  TURNAROUND: "Turnaround",
  KEY_CHANGE: "Key Change / Modulasi",
  ADLIB: "Ad-lib",
  SPOKEN: "Spoken / Narrasi",
  TRANSITION: "Transition / Link",
  REPRISE: "Reprise",
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
  { pattern: /^(modulasi|modulation|key[- ]?change|transpos)/i, type: "KEY_CHANGE" },
  { pattern: /^(pre[- ]?chorus|prechorus)\b/i, type: "PRE_CHORUS" },
  { pattern: /^(chorus|reff|refrain)\b/i, type: "CHORUS" },
  { pattern: /^(post[- ]?chorus)\b/i, type: "POST_CHORUS" },
  { pattern: /^(pre[- ]?bridge)\b/i, type: "PRE_BRIDGE" },
  { pattern: /^(bridge)\b/i, type: "BRIDGE" },
  { pattern: /^(interlude)\b/i, type: "INTERLUDE" },
  { pattern: /^(instrumental|instrument)\b/i, type: "INSTRUMENTAL" },
  { pattern: /^(solo)\b/i, type: "SOLO" },
  { pattern: /^(hook|riff)\b/i, type: "HOOK" },
  { pattern: /^(breakdown|break)\b/i, type: "BREAKDOWN" },
  { pattern: /^(vamp|loop)\b/i, type: "VAMP" },
  { pattern: /^(turnaround)\b/i, type: "TURNAROUND" },
  { pattern: /^(ad[- ]?lib)\b/i, type: "ADLIB" },
  { pattern: /^(spoken|narrasi)\b/i, type: "SPOKEN" },
  { pattern: /^(transition|link)\b/i, type: "TRANSITION" },
  { pattern: /^(reprise)\b/i, type: "REPRISE" },
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

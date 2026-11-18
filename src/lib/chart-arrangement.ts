// Bagian lagu (master) + aransemen sequence, gaya ProPresenter.
// Konten tiap bagian tetap ChordPro inline basis C; aransemen hanya mengatur
// urutan dan repeat bagian saat ditampilkan.

import { contentIsNotationSection } from "@/lib/jianpu-align";

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

export const CHART_SECTION_TYPE_HINT: Record<ChartSectionKind, string> = {
  INTRO: "Pembuka instrumental — menetapkan tempo, groove, dan mood.",
  VERSE: "Bait — bagian naratif; tiap bait berbeda lirik, melodi bisa sama.",
  PRE_CHORUS: "Jembatan build-up dari verse menuju chorus.",
  CHORUS: "Bagian klimaks yang berulang; identitas utama lagu.",
  POST_CHORUS: "Hook pendek langsung setelah chorus.",
  PRE_BRIDGE: "Pengangkat pendek sebelum masuk bridge.",
  BRIDGE: "Bagian kontras (melodi/harmoni berbeda) di tengah lagu.",
  INTERLUDE: "Selah instrumental pendek antara dua bagian.",
  INSTRUMENTAL: "Bagian band penuh tanpa vokal.",
  SOLO: "Solo satu instrumen (gitar, sax, keys) di atas progresi lagu.",
  HOOK: "Motif/riff pendek yang mudah dikenali dan mengikat lagu.",
  BREAKDOWN: "Bagian drop — band men-back off, dinamika turun drastis.",
  VAMP: "Loop progesi pendek, diulang sampai mendapat cue berangkat.",
  TAG: "Kalimat/tag pendek yang diletakkan antar bagian besar.",
  TURNAROUND: "1-2 bar progesi balik menyambung ke bagian berikutnya.",
  KEY_CHANGE:
    "Perpindahan nada (modulasi), cth. sebelum chorus terakhir.",
  ADLIB: "Ruang improv vokal; lirik boleh bebas dari teks utama.",
  SPOKEN: "Bagian tutur/spoken word tanpa dinyanyikan.",
  TRANSITION: "Jembatan pendek untuk pindah bagian tanpa jeda.",
  REPRISE: "Ulang bagian sebelumnya dengan variasi pengantar.",
  ENDING: "Penutup lagu: fade-out atau final cadence.",
  CODA: "Ekor penutup yang berbeda dari bagian utama.",
  OTHER: "Di luar kategori — dipakai dengan label bebas.",
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
    type?: string | null;
  };
}

const GENERIC_SECTION_LABEL = /^bagian(?:\s+\d+)?$/i;

export function isGenericSectionLabel(label: string): boolean {
  return GENERIC_SECTION_LABEL.test(label.trim());
}

// Label "Bagian n" adalah fallback parseLegacyChart untuk chart tanpa heading.
// Bagian intro (tipe INTRO, atau isinya hanya not angka) harus tampil sebagai Intro.
export function displaySectionLabel(
  label: string,
  options?: { type?: string | null; content?: string | null },
): string {
  const trimmed = label.trim();
  if (/^intro$/i.test(trimmed)) return "Intro";
  if (!isGenericSectionLabel(trimmed)) return trimmed;
  if (options?.type === "INTRO") return "Intro";
  if (options?.content && contentIsNotationSection(options.content)) return "Intro";
  return trimmed;
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
    const written = currentLabel?.trim() || "";
    // Chart lama sering menaruh intro not angka di atas tanpa {Intro}.
    // Fallback "Bagian n" membuat heading tampil BAGIAN 1 (CSS uppercase).
    const notationIntro = !written && contentIsNotationSection(body);
    const label = written || (notationIntro ? "Intro" : `Bagian ${++unlabeled}`);
    sections.push({
      label,
      type: notationIntro ? "INTRO" : inferSectionType(label),
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
      const stored = (item.labelOverride?.trim() || item.section.label).trim();
      const label = displaySectionLabel(stored, {
        type: item.section.type,
        content: item.section.content,
      });
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

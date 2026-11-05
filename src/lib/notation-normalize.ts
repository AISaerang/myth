// Rencana normalisasi not angka dan label intro.
// Tidak menyentuh database. Skrip `normalize:notation` yang menerapkan.

import {
  displaySectionLabel,
  isGenericSectionLabel,
  makeUniqueSectionLabel,
} from "@/lib/chart-arrangement";
import { contentIsNotationSection } from "@/lib/jianpu-align";
import { canonicalizeNotationText } from "@/lib/jianpu";

export interface NotationSectionInput {
  id: string;
  label: string;
  type: string;
  content: string;
}

export interface NotationOverrideInput {
  id: string;
  sectionId: string;
  labelOverride: string | null;
}

export interface NotationSongInput {
  title: string;
  introNotation: string | null;
  sections: NotationSectionInput[];
  overrides: NotationOverrideInput[];
}

export interface NotationSectionChange {
  id: string;
  labelBefore: string;
  labelAfter: string;
  typeBefore: string;
  typeAfter: string;
  contentBefore: string;
  contentAfter: string;
}

export interface NotationOverrideChange {
  id: string;
  sectionId: string;
  before: string;
  after: null;
}

export interface NotationSongPlan {
  title: string;
  introNotation: { before: string; after: string } | null;
  sections: NotationSectionChange[];
  overrides: NotationOverrideChange[];
}

function sectionShouldBeIntro(section: NotationSectionInput, content: string): boolean {
  const generic = isGenericSectionLabel(section.label);
  const looseIntro = /^intro$/i.test(section.label) && section.label !== "Intro";
  if (section.type === "INTRO") return generic || looseIntro;
  if (!(generic || looseIntro)) return false;
  return contentIsNotationSection(content);
}

export function planNotationNormalization(song: NotationSongInput): NotationSongPlan | null {
  const introBefore = song.introNotation ?? "";
  const introAfter = canonicalizeNotationText(introBefore);
  const introNotation =
    song.introNotation !== null && introAfter !== introBefore
      ? { before: introBefore, after: introAfter }
      : null;

  const used = new Set(song.sections.map((section) => section.label));
  const sections: NotationSectionChange[] = [];
  const introIds = new Set<string>();

  for (const section of song.sections) {
    const contentAfter = canonicalizeNotationText(section.content);
    let labelAfter = section.label;
    let typeAfter = section.type;
    if (sectionShouldBeIntro(section, contentAfter)) {
      used.delete(section.label);
      labelAfter = makeUniqueSectionLabel("Intro", used);
      used.add(labelAfter);
      typeAfter = "INTRO";
      introIds.add(section.id);
    } else if (section.type === "INTRO") {
      introIds.add(section.id);
    }

    if (
      labelAfter !== section.label ||
      typeAfter !== section.type ||
      contentAfter !== section.content
    ) {
      sections.push({
        id: section.id,
        labelBefore: section.label,
        labelAfter,
        typeBefore: section.type,
        typeAfter,
        contentBefore: section.content,
        contentAfter,
      });
    }
  }

  const labelById = new Map(song.sections.map((section) => [section.id, section.label]));
  for (const change of sections) labelById.set(change.id, change.labelAfter);

  const overrides: NotationOverrideChange[] = [];
  for (const item of song.overrides) {
    const override = item.labelOverride?.trim() ?? "";
    if (!override || !introIds.has(item.sectionId)) continue;
    const sectionLabel = labelById.get(item.sectionId) ?? "";
    const shown = displaySectionLabel(override, { type: "INTRO", content: "" });
    if (shown === "Intro" && override !== sectionLabel) {
      overrides.push({ id: item.id, sectionId: item.sectionId, before: override, after: null });
    }
  }

  if (!introNotation && sections.length === 0 && overrides.length === 0) return null;
  return { title: song.title, introNotation, sections, overrides };
}

export function formatNotationDiff(plan: NotationSongPlan): string {
  const lines = [`- ${plan.title}`];
  if (plan.introNotation) {
    lines.push("  introNotation:");
    for (const line of plan.introNotation.before.split("\n")) lines.push(`  - ${line}`);
    for (const line of plan.introNotation.after.split("\n")) lines.push(`  + ${line}`);
  }
  for (const section of plan.sections) {
    lines.push(`  bagian "${section.labelBefore}":`);
    if (section.labelBefore !== section.labelAfter) {
      lines.push(`  - label: ${section.labelBefore}`);
      lines.push(`  + label: ${section.labelAfter}`);
    }
    if (section.typeBefore !== section.typeAfter) {
      lines.push(`  - type: ${section.typeBefore}`);
      lines.push(`  + type: ${section.typeAfter}`);
    }
    if (section.contentBefore !== section.contentAfter) {
      lines.push("  content:");
      for (const line of section.contentBefore.split("\n")) lines.push(`  - ${line}`);
      for (const line of section.contentAfter.split("\n")) lines.push(`  + ${line}`);
    }
  }
  for (const item of plan.overrides) {
    lines.push(`  label tampil aransemen (${item.sectionId}):`);
    lines.push(`  - ${item.before}`);
    lines.push("  + (ikut label bagian)");
  }
  return lines.join("\n");
}

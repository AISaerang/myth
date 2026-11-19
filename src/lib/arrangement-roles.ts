export const ARRANGEMENT_ROLE_CATALOG = [
  { slug: "drum", label: "Drum" },
  { slug: "guitar_lead", label: "Gitar Lead" },
  { slug: "piano_layer", label: "Piano Layer/Synth" },
  { slug: "bass", label: "Bass" },
  { slug: "vocal", label: "Vokal" },
] as const;

export type ArrangementRoleSlug =
  (typeof ARRANGEMENT_ROLE_CATALOG)[number]["slug"];

export type ArrangementInstrumentPov =
  | "chart"
  | "guitar"
  | "piano"
  | ArrangementRoleSlug;

export function roleLabel(slug: string): string {
  return ARRANGEMENT_ROLE_CATALOG.find((role) => role.slug === slug)?.label ?? slug;
}

export function preferredInstrumentPov(
  skillName: string | null,
  visibleTabs: readonly ArrangementRoleSlug[],
): ArrangementInstrumentPov {
  const skill = skillName?.trim().toLowerCase() ?? "";
  if (!skill) return "chart";
  if (
    skill.includes("gitar lead") ||
    skill.includes("lead guitar") ||
    skill === "lead"
  ) {
    return visibleTabs.includes("guitar_lead") ? "guitar_lead" : "guitar";
  }
  if (
    skill.includes("gitar") ||
    skill.includes("guitar") ||
    skill.includes("acoustic")
  ) {
    return "guitar";
  }
  if (
    skill.includes("piano layer") ||
    skill.includes("keyboard layer") ||
    skill === "layer" ||
    skill === "synth"
  ) {
    return visibleTabs.includes("piano_layer") ? "piano_layer" : "piano";
  }
  if (
    skill.includes("piano") ||
    skill.includes("keyboard") ||
    skill.includes("keys")
  ) {
    return "piano";
  }
  if (
    skill.includes("drum") ||
    skill.includes("drums") ||
    skill.includes("perkusi")
  ) {
    return "drum";
  }
  if (skill === "bass") return "bass";
  if (
    skill.includes("vokal") ||
    skill.includes("vocal") ||
    skill.includes("singer") ||
    skill.includes("choir") ||
    skill.includes("paduan suara")
  ) {
    return "vocal";
  }
  return "chart";
}

export function roleTabVisible(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const sections = (data as { sections?: Record<string, unknown> }).sections;
  if (!sections || typeof sections !== "object") return false;
  return Object.values(sections).some((section) => {
    if (!section || typeof section !== "object") return false;
    return Object.values(section as Record<string, unknown>).some(
      (value) => typeof value === "string" && value.trim().length > 0,
    );
  });
}

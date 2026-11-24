import { parseChord } from "@/lib/chords";

export interface ChordSymbolParts {
  root: string;
  quality: string;
  extension: string;
  bass: string | null;
  optional: boolean;
  noChord: boolean;
}

function accidentalGlyph(value: string): string {
  return value.replace(/#/g, "♯").replace(/b/g, "♭");
}

export function formatChordSymbol(token: string): ChordSymbolParts {
  const trimmed = token.trim();
  const optional = /^\(.*\)$/.test(trimmed);
  const unwrapped = optional ? trimmed.slice(1, -1).trim() : trimmed;
  const noChord = unwrapped === "N.C.";

  if (noChord) {
    return { root: "N.C.", quality: "", extension: "", bass: null, optional, noChord: true };
  }

  try {
    const parsed = parseChord(unwrapped);
    let quality = "";
    let extension = parsed.suffix;

    if (/^m7b5$/i.test(parsed.suffix)) {
      quality = "m";
      extension = "7♭5";
    } else if (/^m(?!aj)(?:in)?/.test(parsed.suffix)) {
      quality = "m";
      extension = parsed.suffix.replace(/^m(?:in)?/i, "");
    } else if (/^maj/.test(parsed.suffix)) {
      quality = "";
      extension = parsed.suffix;
    } else if (/^dim(?:7)?$/.test(parsed.suffix)) {
      quality = "dim";
      extension = parsed.suffix.replace(/^dim/, "");
    } else if (/^aug(?:7)?$/.test(parsed.suffix) || /^\+$/.test(parsed.suffix)) {
      quality = "aug";
      extension = parsed.suffix.replace(/^aug/, "").replace(/^\+/, "");
    } else if (/^sus/.test(parsed.suffix)) {
      quality = "sus";
      extension = parsed.suffix.replace(/^sus/, "");
    } else if (/^add/.test(parsed.suffix)) {
      quality = "";
      extension = parsed.suffix;
    } else if (/^M/.test(parsed.suffix)) {
      quality = "";
      extension = parsed.suffix.slice(1);
    }

    return {
      root: accidentalGlyph(parsed.root),
      quality,
      extension: accidentalGlyph(extension),
      bass: parsed.bassRoot ? accidentalGlyph(parsed.bassRoot) : null,
      optional,
      noChord: false,
    };
  } catch {
    return {
      root: accidentalGlyph(trimmed),
      quality: "",
      extension: "",
      bass: null,
      optional,
      noChord: false,
    };
  }
}

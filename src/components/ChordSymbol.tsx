import { formatChordSymbol } from "@/lib/chord-symbol-display";
import { simplifyChordToken, transposeChord } from "@/lib/chords";

export function ChordSymbol({
  token,
  simplify = false,
  semitones = 0,
  useFlats = false,
}: {
  token: string;
  simplify?: boolean;
  semitones?: number;
  useFlats?: boolean;
}) {
  let displayToken = token;
  if (semitones !== 0) {
    try {
      displayToken = transposeChord(token, semitones, useFlats);
    } catch {
      displayToken = token;
    }
  }
  if (simplify) displayToken = simplifyChordToken(displayToken);
  const parts = formatChordSymbol(displayToken);

  if (parts.noChord) return <span aria-label="N.C.">N.C.</span>;

  return (
    <span
      className={parts.optional ? "inline-flex items-baseline opacity-60" : "inline-flex items-baseline"}
      aria-label={displayToken}
    >
      {parts.optional ? "(" : null}
      <span>{parts.root}</span>
      {parts.quality ? <span>{parts.quality}</span> : null}
      {parts.extension ? <sup className="chord-ext">{parts.extension}</sup> : null}
      {parts.bass ? <span>/{parts.bass}</span> : null}
      {parts.optional ? ")" : null}
    </span>
  );
}

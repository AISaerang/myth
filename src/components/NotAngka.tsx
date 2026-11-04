"use client";

import { parseJianpu } from "@/lib/jianpu";

/**
 * NotAngka renders JianpuASCII notation using the JianpuASCII font loaded via
 * CSS @font-face. Falls back to CSS-styled regular text if the font fails.
 *
 * @param value - Notation string, e.g. "6, 5, 1 2 3" or "1' 2' 3' | 4 5 6"
 * @param className - Optional Tailwind classes
 */
export function NotAngka({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const result = parseJianpu(value);

  if (!result.valid) {
    return (
      <span className={`text-red-600 dark:text-red-400 text-xs ${className}`}>
        Notasi tidak valid: {result.error}
      </span>
    );
  }

  if (result.lines.length === 0) {
    return null;
  }

  return (
    <span
      className={`font-jianpu text-lg leading-relaxed ${className}`}
      style={{ fontFeatureSettings: '"liga"' }}
    >
      {result.lines.map((line, i) => (
        <span key={i} className="inline-block w-full">
          {line.notes.map((note) => (
            <span key={note.solfege + "," + note.octave} className="mr-1">
              <NotanChar note={note} />
            </span>
          ))}
          {i < result.lines.length - 1 ? (
            <span className="mx-1 text-zinc-400">|</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

/** Render single not angka character with fallback styling. */
function NotanChar({ note }: { note: import("@/lib/jianpu").JianpuNote }) {
  return (
    <span style={{ fontFamily: "var(--font-jianpu-ascii)" }}>
      {note.accidental === 1 ? "#" : note.accidental === -1 ? "♭" : null}
      {note.solfege}
      {note.octave > 0 ? (
        <span className="relative -top-2 text-xs font-mono">
          {"'".repeat(note.octave)}
        </span>
      ) : note.octave < 0 ? (
        <span className="relative top-1 text-xs font-mono">
          {",".repeat(-note.octave)}
        </span>
      ) : null}
      {note.duration === 0.5 ? "/" : note.duration === 0.25 ? "//" : null}
      {"-".repeat(note.extension)}
      {note.dotted ? "." : null}
    </span>
  );
}

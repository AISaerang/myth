"use client";

import { alignChordsToNotation, type NotationAlignment } from "@/lib/jianpu-align";
import { parseJianpu, type JianpuNote } from "@/lib/jianpu";

/**
 * Not angka satu baris dengan kunci di kolom yang sama. Titik oktaf, garis
 * kres/mol, garis ketukan, slur beam dan birama semuanya CSS — tidak ada font
 * JianpuASCII lagi.
 */
export function NotationLine({ alignment }: { alignment: NotationAlignment }) {
  const notes = alignment.tokens.filter((token) => token.kind === "note");
  const aria = [
    alignment.chords.length > 0
      ? `Kunci ${alignment.chords.map((chord) => chord.token).join(" ")}`
      : "",
    `Not angka ${notes.map((token) => token.raw).join(" ")}`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      className="notation-staff"
      style={{ width: `calc(${alignment.columns} * 1ch)` }}
      data-notation-line=""
      data-columns={alignment.columns}
      role="img"
      aria-label={aria}
    >
      {alignment.chords.length > 0 ? (
        <div className="notation-chords">
          {alignment.chords.map((chord, index) => (
            <span
              key={`${chord.token}-${chord.renderCol}-${index}`}
              data-chord={chord.token}
              data-render-col={chord.renderCol}
              className="absolute top-0 font-semibold text-sky-700 dark:text-sky-400"
              style={{ left: `calc(${chord.renderCol} * 1ch)` }}
            >
              {chord.token}
            </span>
          ))}
        </div>
      ) : null}
      <div className="notation-notes">
        {alignment.groups.map((group, index) => (
          <span
            key={`${group.kind}-${group.from}-${group.to}-${index}`}
            className={group.kind === "slur" ? "notation-slur" : "notation-beam"}
            data-notation-group={group.kind}
            data-from={group.from}
            data-to={group.to}
            aria-hidden
            style={{
              left: `calc(${group.from} * 1ch)`,
              width: `calc(${Math.max(group.to - group.from + 1, 1)} * 1ch)`,
            }}
          />
        ))}
        {alignment.tokens.map((token, index) => (
          <span
            key={`${token.raw}-${token.renderCol}-${index}`}
            data-note={token.raw}
            data-kind={token.kind}
            data-render-col={token.renderCol}
            className="absolute whitespace-pre"
            style={{ left: `calc(${token.renderCol} * 1ch)`, top: "0.72em" }}
          >
            {token.kind === "bar" ? (
              "|"
            ) : token.note ? (
              <FallbackNote note={token.note} />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

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
      <span className={`text-xs text-red-600 dark:text-red-400 ${className}`}>
        Notasi tidak valid: {result.error}
      </span>
    );
  }
  if (result.lines.length === 0) return null;

  const lines = value.split(/\n/);
  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      {lines.map((line, index) => {
        const aligned = alignChordsToNotation("", line);
        if (!aligned) {
          const error = notationErrorFor(line);
          return (
            <span key={index} className="block">
              {line.trim() ? (
                <span className="font-mono text-sm">{line}</span>
              ) : (
                <span className="block h-2" />
              )}
              {error ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </span>
              ) : null}
            </span>
          );
        }
        return <NotationLine key={index} alignment={aligned} />;
      })}
    </span>
  );
}

/** Pesan kenapa baris ini gagal dirender sebagai not angka (atau null). */
function notationErrorFor(line: string): string | null {
  if (!line.trim()) return null;
  try {
    const result = parseJianpu(line);
    if (!result.valid) return `Notasi tidak valid: ${result.error}`;
  } catch {
    return "Notasi tidak valid.";
  }
  return null;
}

function FallbackNote({ note }: { note: JianpuNote }) {
  const marks = Math.abs(note.octave);
  const up = note.octave > 0;
  return (
    <>
      <span className="relative inline-block w-[1ch] text-center leading-none">
        {note.accidental !== 0 ? (
          <span className="absolute top-0 right-full pr-px text-[0.65em] leading-none">
            {note.accidental === 1 ? "♯" : "♭"}
          </span>
        ) : null}
        {note.solfege}
        {marks > 0 ? (
          <span
            data-octave={up ? "up" : "down"}
            className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-px ${
              up ? "bottom-full mb-px" : "top-full mt-px"
            }`}
          >
            {Array.from({ length: marks }, (_, index) => (
              <span key={index} className="jianpu-dot" />
            ))}
          </span>
        ) : null}
        {note.duration < 1 ? (
          <span
            data-underline={note.duration === 0.25 ? "2" : "1"}
            className="absolute top-full right-0 left-0 mt-px flex flex-col gap-px"
          >
            <span className="h-px w-full bg-current" />
            {note.duration === 0.25 ? <span className="h-px w-full bg-current" /> : null}
          </span>
        ) : null}
      </span>
      {note.extension > 0 ? "-".repeat(note.extension) : null}
      {note.dotted ? "." : null}
    </>
  );
}

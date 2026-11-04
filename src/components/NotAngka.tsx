import { alignChordsToNotation, type NotationAlignment, type NotationToken } from "@/lib/jianpu-align";
import { parseJianpu, type JianpuNote } from "@/lib/jianpu";

/**
 * Not angka satu baris dengan kunci di kolom yang sama.
 * Titik oktaf, garis kres/mol, beam, dan legato digambar CSS — tanpa font khusus.
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
  const beams = groupOverlays(alignment.tokens, "beam");
  const slurs = groupOverlays(alignment.tokens, "slur");

  return (
    <div
      className="notation-staff font-mono text-sm leading-6"
      style={{ width: `calc(${alignment.columns} * 1ch)` }}
      data-notation-line=""
      data-notation="css"
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
              className="absolute font-semibold text-sky-700 dark:text-sky-400"
              style={{ left: `calc(${chord.renderCol} * 1ch)` }}
            >
              {chord.token}
            </span>
          ))}
        </div>
      ) : null}
      <div className="notation-notes">
        {slurs.map((slur) => (
          <span
            key={`slur-${slur.id}`}
            data-slur={slur.level}
            className="notation-slur"
            style={{
              left: `calc(${slur.start} * 1ch)`,
              width: `calc(${Math.max(slur.width, 1)} * 1ch)`,
            }}
            aria-hidden
          />
        ))}
        {beams.map((beam) => (
          <span
            key={`beam-${beam.id}`}
            data-beam={beam.level}
            className="notation-beam"
            style={{
              left: `calc(${beam.start} * 1ch)`,
              width: `calc(${Math.max(beam.width, 1)} * 1ch)`,
            }}
            aria-hidden
          />
        ))}
        {alignment.tokens.map((token, index) => (
          <span
            key={`${token.raw}-${token.renderCol}-${index}`}
            data-note={token.raw}
            data-kind={token.kind}
            data-render-col={token.renderCol}
            className="notation-cell absolute whitespace-pre"
            style={{ left: `calc(${token.renderCol} * 1ch)` }}
          >
            {token.kind === "bar" ? "|" : token.note ? <CssNote note={token.note} /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function NotAngka({ value, className = "" }: { value: string; className?: string }) {
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
          return line.trim() ? (
            <span key={index} className="font-mono text-sm">
              {line}
            </span>
          ) : (
            <span key={index} className="block h-2" />
          );
        }
        return <NotationLine key={index} alignment={aligned} />;
      })}
    </span>
  );
}

function CssNote({ note }: { note: JianpuNote }) {
  const marks = Math.abs(note.octave);
  const up = note.octave > 0;
  return (
    <>
      <span className="relative inline-block w-[1ch] text-center leading-none">
        {marks > 0 ? (
          <span
            data-octave={up ? "up" : "down"}
            data-octave-marks={marks}
            className={`absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-px ${
              up ? "bottom-full mb-px" : "jianpu-octave-down top-full mt-px"
            }`}
          >
            {Array.from({ length: marks }, (_, index) => (
              <span key={index} className="jianpu-dot" />
            ))}
          </span>
        ) : null}
        {note.solfege}
        {note.accidental !== 0 ? (
          <span
            data-accidental={note.accidental === 1 ? "sharp" : "flat"}
            className="jianpu-accidental"
            aria-hidden
          />
        ) : null}
        {note.duration < 1 ? (
          <span
            data-underline={note.duration === 0.25 ? "2" : "1"}
            className="jianpu-underlines"
          >
            <span className="block h-px w-full bg-current" />
            {note.duration === 0.25 ? <span className="block h-px w-full bg-current" /> : null}
          </span>
        ) : null}
      </span>
      {note.extension > 0 ? "-".repeat(note.extension) : null}
      {note.dotted ? "." : null}
    </>
  );
}

function groupOverlays(tokens: NotationToken[], kind: "beam" | "slur") {
  const groups = new Map<number, NotationToken[]>();
  for (const token of tokens) {
    if (token.kind !== "note") continue;
    const id = kind === "beam" ? token.beamGroup : token.slurGroup;
    const level = kind === "beam" ? token.beam : id ? 1 : 0;
    if (!id || level < 1) continue;
    const list = groups.get(id) ?? [];
    list.push(token);
    groups.set(id, list);
  }
  return [...groups.entries()].map(([id, notes]) => {
    const first = notes[0] as NotationToken;
    const last = notes[notes.length - 1] as NotationToken;
    return {
      id,
      level: kind === "beam" ? first.beam : 1,
      start: first.renderCol,
      width: last.renderCol + last.renderWidth - first.renderCol,
    };
  });
}

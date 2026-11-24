"use client";

import type { ChartLineModel } from "@/lib/chart-cells";
import type { layersForMode } from "@/lib/chart-view-mode";
import { ChordSymbol } from "@/components/ChordSymbol";
import type { JianpuNote } from "@/lib/jianpu";

export function ChartLineView({
  model,
  layers,
  simplify = false,
  onChordClick,
}: {
  model: ChartLineModel;
  layers: ReturnType<typeof layersForMode>;
  simplify?: boolean;
  onChordClick?: (symbol: string) => void;
}) {
  if (model.kind === "empty") return <div className="h-4" />;
  if (model.kind === "label") return null;
  if (model.kind === "comment") {
    return layers.comments ? <p data-chart-comment="" className="chart-comment">{model.text}</p> : null;
  }
  if (model.kind === "error") {
    return (
      <div data-notation-error="" className="chart-error">
        <span>{model.message}</span>
      </div>
    );
  }

  if (model.kind === "notation" && !layers.notation) {
    if (!layers.chords) return null;
    const chordCells = model.words.flatMap((word) =>
      word.cells.flatMap((cell) =>
        cell.chord
          ? [<ChordSymbol key={`${word.cells.indexOf(cell)}-${cell.chord}`} token={cell.chord} simplify={simplify} />]
          : [],
      ),
    );
    return <div className="chart-line chart-notation-chords" data-chart-chords-only="">{chordCells}</div>;
  }
  if (model.kind === "bars" && !layers.chords) return null;

  return (
    <div className="chart-line" data-chart-line={model.kind}>
      {model.words.map((word, wordIndex) => (
        <span
          key={wordIndex}
          className="chart-word"
          data-chart-word={word.isBar ? "bar" : undefined}
        >
          {word.isBar ? (
            <span className="chart-bar">|</span>
          ) : (
            word.cells.map((cell, cellIndex) => (
              <span
                key={cellIndex}
                className="chart-cell"
                data-chord={layers.chords && cell.chord ? cell.chord : undefined}
                data-note={cell.note?.raw}
              >
                {layers.chords && cell.chord ? (
                  <span className="chart-chord-row">
                    {onChordClick ? (
                      <button
                        type="button"
                        className="chart-chord-button"
                        aria-label={`Tampilkan voicing ${cell.chord}`}
                        onClick={() => onChordClick(cell.chord as string)}
                      >
                        <ChordSymbol token={cell.chord} simplify={simplify} />
                      </button>
                    ) : (
                      <span className="chart-chord" data-chord={cell.chord}>
                        <ChordSymbol token={cell.chord} simplify={simplify} />
                      </span>
                    )}
                  </span>
                ) : null}
                {layers.notation && cell.note?.note ? (
                  <span className="chart-notation-row" aria-label={cell.note.raw}>
                    <NotationGlyph note={cell.note.note} />
                  </span>
                ) : null}
                {layers.lyrics && model.kind !== "bars" ? (
                  <span className="chart-text-cell">{cell.text}</span>
                ) : null}
              </span>
            ))
          )}
        </span>
      ))}
    </div>
  );
}

function NotationGlyph({ note }: { note: JianpuNote }) {
  const marks = Math.abs(note.octave);
  const up = note.octave > 0;
  return (
    <span className="jianpu-glyph">
      {marks > 0 ? (
        <span
          className={`jianpu-octave ${up ? "jianpu-octave-up" : "jianpu-octave-down"}`}
          data-octave-marks={marks}
        >
          {Array.from({ length: marks }, (_, index) => <span key={index} className="jianpu-dot" />)}
        </span>
      ) : null}
      {note.solfege}
      {note.accidental !== 0 ? (
        <span className="jianpu-accidental" data-accidental={note.accidental === 1 ? "sharp" : "flat"} />
      ) : null}
      {note.duration < 1 ? (
        <span className="jianpu-underlines">
          <span />
          {note.duration === 0.25 ? <span /> : null}
        </span>
      ) : null}
      {note.extension > 0 ? "-".repeat(note.extension) : null}
      {note.dotted ? "." : null}
    </span>
  );
}

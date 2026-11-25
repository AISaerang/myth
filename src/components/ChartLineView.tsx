"use client";

import { Component, type ReactNode } from "react";
import type { ChartLineModel } from "@/lib/chart-cells";
import type { layersForMode } from "@/lib/chart-view-mode";
import { ChordSymbol } from "@/components/ChordSymbol";
import { CssNote } from "@/components/NotAngka";
import type { JianpuNote } from "@/lib/jianpu";

export class ChartLineErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <p className="chart-error" role="alert">
        Baris chart belum bisa ditampilkan.
      </p>
    ) : this.props.children;
  }
}

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
    return layers.comments ? (
      <span data-chart-comment="" className="chart-comment chart-comment-inline">
        {model.text}
      </span>
    ) : null;
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

  if (model.kind === "couplet") {
    return (
      <div className="chart-couplet chart-line" data-chart-couplet="">
        {layers.chords ? (
          <div className="chart-couplet-row chart-couplet-chords" data-chart-chord-row="">
            {model.words.map((word, wordIndex) => (
              <span key={wordIndex} className="chart-word">
                {word.cells.map((cell, cellIndex) => (
                  <span key={cellIndex} className="chart-cell" data-chord={cell.chord ?? undefined}>
                    {cell.chord ? (
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
                  </span>
                ))}
              </span>
            ))}
          </div>
        ) : null}
        {layers.notation ? (
          <div className="chart-couplet-row chart-couplet-notes" data-chart-note-row="">
            {model.words.map((word, wordIndex) => (
              <span key={wordIndex} className="chart-word" data-chart-word={word.isBar ? "bar" : undefined}>
                {word.isBar ? <span className="chart-bar">|</span> : word.cells.map((cell, cellIndex) => (
                  <span key={cellIndex} className="chart-cell" data-note={cell.note?.raw}>
                    {cell.note?.note ? (
                      <span className="chart-notation-row" aria-label={cell.note.raw}>
                        <NotationGlyph note={cell.note.note} />
                      </span>
                    ) : null}
                  </span>
                ))}
              </span>
            ))}
          </div>
        ) : null}
        {layers.lyrics ? (
          <div className="chart-couplet-row chart-couplet-lyrics" data-chart-text-row="">
            {model.words.map((word, wordIndex) => (
              <span key={wordIndex} className="chart-word">
                {word.isBar ? null : word.cells.map((cell, cellIndex) => (
                  <span key={cellIndex} className="chart-cell">
                    {cell.text}
                    {cell.joinNext ? <span className="chart-hyphen" aria-hidden="true">-</span> : null}
                  </span>
                ))}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

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
                  <span className="chart-text-cell">
                    {cell.text}
                    {cell.joinNext ? <span className="chart-hyphen" aria-hidden="true">-</span> : null}
                  </span>
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
  return (
    <span className="jianpu-glyph inline-flex items-baseline">
      <CssNote note={note} />
      {note.extension > 0 ? "-".repeat(note.extension) : null}
      {note.dotted ? "." : null}
    </span>
  );
}

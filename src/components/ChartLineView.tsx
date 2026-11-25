"use client";

import { Component, type ReactNode } from "react";
import type { ChartCell, ChartLineModel } from "@/lib/chart-cells";
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
    if (!model.paired) {
      return (
        <div
          className="chart-couplet chart-line"
          data-chart-couplet=""
          data-chart-paired="false"
          data-lyric-text={model.lyricText}
        >
          {layers.chords || layers.notation ? (
            <div className="chart-line">
              {model.words.map((word, wordIndex) => (
                <span key={wordIndex} className="chart-word" data-chart-word={word.isBar ? "bar" : undefined}>
                  {word.isBar ? (
                    layers.chords ? <span className="chart-bar">|</span> : null
                  ) : word.cells.map((cell, cellIndex) => (
                    <span
                      key={cellIndex}
                      className={chartCellClassName(cell, word.cells[cellIndex + 1])}
                      data-chord={layers.chords ? cell.chord ?? undefined : undefined}
                      data-note={layers.notation ? cell.note?.raw : undefined}
                      data-trailing={cell.trailing ? "true" : undefined}
                    >
                      {layers.chords && cell.chord ? (
                        <span className="chart-chord-row">
                          {onChordClick ? (
                            <button
                              type="button"
                              className="chart-chord-button"
                              onClick={() => onChordClick(cell.chord as string)}
                            >
                              <ChordSymbol token={cell.chord} simplify={simplify} />
                            </button>
                          ) : (
                            <span className="chart-chord">
                              <ChordSymbol token={cell.chord} simplify={simplify} />
                            </span>
                          )}
                        </span>
                      ) : null}
                      {layers.notation && cell.note?.note ? (
                        <span className="chart-notation-row">
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
            <span className="chart-line chart-couplet-fallback" data-chart-text-row="">
              {model.lyricText}
            </span>
          ) : null}
          <span className="sr-only">{model.lyricText}</span>
        </div>
      );
    }
    return (
      <div
        className="chart-couplet chart-line"
        data-chart-couplet=""
        data-chart-paired="true"
        data-lyric-text={model.lyricText}
      >
        {model.words.map((word, wordIndex) =>
          word.isBar ? (
            layers.notation ? (
              <span key={wordIndex} className="chart-word" data-chart-word="bar">
                <span className="chart-bar">|</span>
              </span>
            ) : null
          ) : (
            <span
              key={wordIndex}
              className="chart-word"
              data-chart-word=""
              data-chart-lyric-word={word.cells[0]?.wordIndex ?? wordIndex}
            >
              {word.cells.map((cell, cellIndex) => (
                <span
                  key={cellIndex}
                  className={chartCellClassName(cell, word.cells[cellIndex + 1])}
                  data-chord={layers.chords && cell.chord ? cell.chord : undefined}
                  data-note={layers.notation && cell.note ? cell.note.raw : undefined}
                  data-trailing={cell.trailing ? "true" : undefined}
                >
                  {layers.chords && cell.chord ? (
                    <span className="chart-chord-row chart-chord-lane">
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
                  ) : layers.chords ? <span className="chart-chord-row chart-chord-lane" aria-hidden="true" /> : null}
                  {layers.notation && cell.note?.note ? (
                    <span className="chart-notation-row" aria-label={cell.note.raw}>
                      <NotationGlyph note={cell.note.note} />
                    </span>
                  ) : layers.notation ? <span className="chart-notation-row" aria-hidden="true">&nbsp;</span> : null}
                  {layers.lyrics ? (
                    <span className="chart-text-cell">
                      {cell.text || "\u00a0"}
                      {hasVisibleHyphen(cell) ? <span className="chart-hyphen" aria-hidden="true">-</span> : null}
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          ),
        )}
        <span className="sr-only">{model.lyricText}</span>
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
                className={chartCellClassName(cell, word.cells[cellIndex + 1])}
                data-chord={layers.chords && cell.chord ? cell.chord : undefined}
                data-note={cell.note?.raw}
                data-trailing={cell.trailing ? "true" : undefined}
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
                    {hasVisibleHyphen(cell) ? <span className="chart-hyphen" aria-hidden="true">-</span> : null}
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

function chartCellClassName(
  cell: ChartCell,
  nextCell: ChartCell | undefined,
): string {
  return [
    "chart-cell",
    cell.chord ? "chart-cell-chord" : "",
    cell.continues ? "chart-cell-continues" : "",
    cell.chord && nextCell?.chord ? "chart-cell-gap" : "",
    cell.trailing ? "chart-cell-trailing" : "",
    cell.chord && cell.continues && !cell.joinNext ? "chart-cell-stretch" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function hasVisibleHyphen(cell: ChartCell): boolean {
  return cell.joinNext || Boolean(cell.chord && cell.continues && !cell.joinNext);
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

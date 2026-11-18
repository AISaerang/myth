import type { GuitarShape } from "@/lib/instrument-voicings";

function shapeLabel(shape: GuitarShape): string {
  return shape.frets.map((fret) => (fret === "x" ? "x" : fret === 0 ? "o" : fret)).join(" ");
}

export function GuitarChordDiagram({
  chord,
  shape,
  compact = false,
}: {
  chord: string;
  shape: GuitarShape;
  compact?: boolean;
}) {
  const width = compact ? 112 : 176;
  const height = compact ? 132 : 188;
  const left = compact ? 16 : 24;
  const right = width - (compact ? 12 : 20);
  const top = compact ? 30 : 38;
  const fretHeight = compact ? 18 : 24;
  const stringGap = (right - left) / 5;
  const stringsLabel = shapeLabel(shape);
  const barreLabel = shape.barre ? `, barre fret ${shape.barre.fret}` : "";
  const yForFret = (fret: number) =>
    top + (fret - shape.baseFret + 0.5) * fretHeight;

  return (
    <svg
      role="img"
      aria-label={`Gitar: ${chord}${barreLabel}, senar ${stringsLabel}`}
      viewBox={`0 0 ${width} ${height}`}
      className={compact ? "h-[132px] w-[112px]" : "h-[188px] w-[176px]"}
    >
      {shape.baseFret > 1 ? (
        <text
          x={left - 8}
          y={top + fretHeight / 2 + 4}
          textAnchor="end"
          className="fill-zinc-600 text-[10px] dark:fill-zinc-300"
        >
          {shape.baseFret}
        </text>
      ) : null}
      {Array.from({ length: 5 }, (_, fret) => {
        const y = top + fret * fretHeight;
        return (
          <line
            key={`fret-${fret}`}
            x1={left}
            x2={right}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeWidth={fret === 0 && shape.baseFret === 1 ? 3 : 1}
            className="text-zinc-700 dark:text-zinc-300"
          />
        );
      })}
      {shape.frets.map((fret, string) => {
        const x = left + string * stringGap;
        return (
          <g key={`string-${string}`}>
            <line
              x1={x}
              x2={x}
              y1={top}
              y2={top + 4 * fretHeight}
              stroke="currentColor"
              strokeWidth={string === 0 || string === 5 ? 2 : 1}
              className="text-zinc-600 dark:text-zinc-400"
            />
            {fret === "x" || fret === 0 ? (
              <text
                x={x}
                y={top - 9}
                textAnchor="middle"
                className="fill-zinc-800 text-[11px] font-semibold dark:fill-zinc-100"
              >
                {fret === "x" ? "×" : "o"}
              </text>
            ) : null}
          </g>
        );
      })}
      {shape.barre ? (
        <g>
          <rect
            x={left + shape.barre.fromString * stringGap - 4}
            y={yForFret(shape.barre.fret) - 5}
            width={(shape.barre.toString - shape.barre.fromString) * stringGap + 8}
            height={10}
            rx={5}
            className="fill-indigo-700 dark:fill-indigo-300"
          />
          <text
            x={
              left +
              ((shape.barre.fromString + shape.barre.toString) / 2) * stringGap
            }
            y={yForFret(shape.barre.fret) + 3}
            textAnchor="middle"
            className="fill-white text-[9px] font-bold dark:fill-zinc-900"
          >
            1
          </text>
        </g>
      ) : null}
      {shape.frets.map((fret, string) => {
        const finger = shape.fingers[string] ?? 0;
        if (fret === "x" || fret === 0 || finger === 0) return null;
        if (
          shape.barre &&
          fret === shape.barre.fret &&
          string >= shape.barre.fromString &&
          string <= shape.barre.toString
        ) {
          return null;
        }
        const x = left + string * stringGap;
        return (
          <g key={`finger-${string}`}>
            <circle
              cx={x}
              cy={yForFret(fret)}
              r={compact ? 6 : 8}
              className="fill-indigo-700 dark:fill-indigo-300"
            />
            <text
              x={x}
              y={yForFret(fret) + 3}
              textAnchor="middle"
              className="fill-white text-[8px] font-bold dark:fill-zinc-900"
            >
              {finger}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

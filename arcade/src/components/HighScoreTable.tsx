import { MAX_SCORES, type ScoreEntry } from "../game/scores";

interface Props {
  scores: ScoreEntry[];
  highlightDate?: number | null;
  compact?: boolean;
}

export default function HighScoreTable({ scores, highlightDate = null, compact = false }: Props) {
  const rows = scores.slice(0, compact ? 5 : MAX_SCORES);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Local High Scores</span>
        <span className="text-[0.62rem] tracking-[0.2em] text-cyan-300/50 uppercase">
          {scores.length}/{MAX_SCORES}
        </span>
      </div>
      <div className="divide-y divide-cyan-400/10 overflow-hidden rounded-sm border border-cyan-400/15 bg-black/40">
        {rows.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-cyan-200/45">
            No records yet — be the first.
          </div>
        )}
        {rows.map((s, i) => {
          const isNew = highlightDate != null && s.date === highlightDate && s.score > 0;
          return (
            <div
              key={`${s.date}-${i}`}
              className={`score-row ${isNew ? "is-new" : ""}`}
            >
              <span
                className={`font-num text-sm font-bold ${
                  i === 0 ? "rank-1" : i === 1 ? "rank-2" : i === 2 ? "rank-3" : "text-cyan-200/40"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="truncate font-semibold tracking-[0.18em] text-cyan-50/90"
                  title={s.name}
                >
                  {s.name}
                </span>
                <span className="hidden shrink-0 text-[0.65rem] tracking-widest text-cyan-200/35 sm:inline">
                  W{s.wave}
                </span>
                {isNew && <span className="chip blink !px-1.5 !py-0 !text-[0.6rem]">new</span>}
              </span>
              <span
                className={`font-num text-base font-extrabold ${
                  i === 0 ? "text-amber-300" : "text-cyan-100"
                }`}
              >
                {s.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

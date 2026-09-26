import { useEffect, useState } from "react";
import HighScoreTable from "./HighScoreTable";
import { qualifies, saveScore, type ScoreEntry } from "../game/scores";
import type { GameOverPayload } from "../game/types";

interface Props {
  result: GameOverPayload;
  scores: ScoreEntry[];
  isRecord: boolean;
  onRestart: () => void;
  onMenu: () => void;
  onSaved: (next: ScoreEntry[]) => void;
}

const STAT_LABELS: Array<{ key: keyof GameOverPayload; label: string; suffix?: string }> = [
  { key: "wave", label: "wave" },
  { key: "kills", label: "kills" },
  { key: "bestCombo", label: "best chain" },
  { key: "timeAlive", label: "seconds", suffix: "s" },
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}`;
}

export default function GameOverScreen({
  result,
  scores,
  isRecord,
  onRestart,
  onMenu,
  onSaved,
}: Props) {
  const canSave = qualifies(scores, result.score);
  const [name, setName] = useState("ACE");
  const [savedDate, setSavedDate] = useState<number | null>(null);
  const [list, setList] = useState<ScoreEntry[]>(scores);

  useEffect(() => {
    setName("ACE");
    setSavedDate(null);
    setList(scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const commit = () => {
    if (savedDate != null) return;
    const entry = {
      name: (name.trim().slice(0, 10) || "ACE").toUpperCase(),
      score: result.score,
      wave: result.wave,
      date: Date.now(),
    };
    const next = saveScore(entry);
    setList(next);
    setSavedDate(entry.date);
    onSaved(next);
  };

  return (
    <div className="overlay scanlines">
      <div
        className="animate-pop panel w-[min(94vw,560px)] max-h-[92dvh] overflow-y-auto p-5 sm:p-7"
        onKeyDown={(e) => {
          // keep score-entry keys from also hitting the engine's restart hotkeys
          if (e.key === "Enter" || e.key === " ") {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === "INPUT" || tag === "BUTTON") e.stopPropagation();
          }
        }}
      >
        <div className="text-center">
          <div className="label mb-1">signal lost</div>
          <h2 className="font-display title-glow text-[clamp(2rem,8vw,3.2rem)] leading-none font-black">
            <span className="grad-text-hot">GAME OVER</span>
          </h2>
        </div>

        <div className="mt-5 rounded-sm border border-cyan-400/20 bg-black/45 px-4 py-4 text-center">
          <div className="label mb-1">final score</div>
          <div
            className={`font-num text-[clamp(2.4rem,11vw,3.6rem)] leading-none font-extrabold ${
              isRecord ? "text-amber-300" : "text-white"
            }`}
            style={{ textShadow: isRecord ? "0 0 28px rgba(255,176,46,.6)" : "0 0 22px rgba(62,233,255,.35)" }}
          >
            {result.score.toLocaleString()}
          </div>
          {isRecord && (
            <div className="font-display mt-2 text-[0.7rem] font-extrabold tracking-[0.3em] text-amber-300 blink">
              ★ new personal record ★
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {STAT_LABELS.map((s) => (
            <div
              key={s.label}
              className="rounded-sm border border-white/5 bg-white/[0.03] px-1 py-2 text-center"
            >
              <div className="font-num text-lg leading-none font-extrabold text-cyan-100">
                {s.key === "timeAlive" ? formatTime(result.timeAlive) : result[s.key]}
                {s.suffix ?? ""}
              </div>
              <div className="label mt-1 !text-[0.5rem]">{s.label}</div>
            </div>
          ))}
        </div>

        {canSave && savedDate == null ? (
          <div className="mt-4 rounded-sm border border-amber-300/30 bg-amber-300/[0.07] p-3">
            <div className="label mb-2 !text-amber-200/80">you made the board — sign it</div>
            <div className="flex gap-2">
              <input
                className="name-input"
                value={name}
                maxLength={10}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  // never let typing leak into the engine's global hotkeys
                  e.stopPropagation();
                }}
                aria-label="Pilot name"
                autoFocus
              />
              <button className="btn btn-primary shrink-0 !px-4" onClick={commit}>
                Save
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <HighScoreTable scores={list} highlightDate={savedDate} />
        </div>

        <div className="mt-5 grid gap-2">
          <button className="btn btn-danger w-full !text-base" onClick={onRestart}>
            ⟳ Play again <span className="font-num text-[0.7rem] opacity-70">[R]</span>
          </button>
          <button className="btn btn-ghost w-full" onClick={onMenu}>
            ⌂ Main menu
          </button>
        </div>
      </div>
    </div>
  );
}

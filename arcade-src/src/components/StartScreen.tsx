import HighScoreTable from "./HighScoreTable";
import type { ScoreEntry } from "../game/scores";

interface Props {
  onStart: () => void;
  scores: ScoreEntry[];
  best: number;
}

const ENEMIES: Array<{ name: string; color: string; desc: string }> = [
  { name: "SEEKER", color: "#ff3d7f", desc: "charges you head-on" },
  { name: "TURRET", color: "#ffb02e", desc: "keeps range, shoots" },
  { name: "DASHER", color: "#7cf86b", desc: "wind-up dash attack" },
  { name: "SPLITTER", color: "#c46bff", desc: "shatters into seekers" },
];

const CONTROLS: Array<{ icon: string; title: string; lines: string[] }> = [
  {
    icon: "✥",
    title: "MOVE",
    lines: ["WASD / Arrows", "or drag anywhere"],
  },
  {
    icon: "◎",
    title: "AUTO-CANNON",
    lines: ["fires at the", "nearest hostile"],
  },
  {
    icon: "⚡",
    title: "PULSE",
    lines: ["SPACE / ⚡ button", "vaporises bullets"],
  },
];

export default function StartScreen({ onStart, scores, best }: Props) {
  return (
    <div className="overlay scanlines">
      <div className="animate-pop panel w-[min(94vw,600px)] max-h-[92dvh] overflow-y-auto p-5 sm:p-7">
        <div className="rise-1 mb-1 flex items-center justify-center gap-2">
          <span className="chip">arcade survival</span>
          <span className="chip !border-amber-300/40 !bg-amber-300/10 !text-amber-200">
            60 fps
          </span>
        </div>

        <h1 className="rise-1 font-display title-glow mt-3 text-center text-[clamp(2.4rem,10vw,4.2rem)] leading-[0.95] font-black">
          <span className="grad-text">NEON</span>
          <br />
          <span className="grad-text-hot">VOID</span>
        </h1>

        <p className="rise-2 mt-2 text-center text-sm tracking-[0.25em] text-cyan-200/70 uppercase">
          survive the swarm · chain the kills
        </p>

        <div className="rise-3 mt-5 flex flex-col items-center gap-2">
          <button
            className="btn btn-primary pulse-ring w-full !text-base sm:w-auto sm:!px-12"
            onClick={onStart}
          >
            ▶ Launch
          </button>
          <div className="font-num text-[0.68rem] tracking-[0.2em] text-cyan-200/45">
            PRESS <span className="text-cyan-300">ENTER</span> OR{" "}
            <span className="text-cyan-300">SPACE</span> · BEST{" "}
            <span className="text-amber-200">{best.toLocaleString()}</span>
          </div>
        </div>

        <div className="rise-4 mt-5 grid grid-cols-3 gap-2">
          {CONTROLS.map((c) => (
            <div
              key={c.title}
              className="rounded-sm border border-cyan-400/15 bg-cyan-400/5 px-2 py-3 text-center"
            >
              <div className="text-xl leading-none text-cyan-300">{c.icon}</div>
              <div className="font-display mt-2 text-[0.6rem] font-extrabold tracking-[0.18em] text-cyan-100">
                {c.title}
              </div>
              <div className="mt-1 text-[0.7rem] leading-tight text-cyan-200/55">
                {c.lines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rise-3 mt-3 grid gap-1.5 sm:grid-cols-2">
          {ENEMIES.map((e) => (
            <div
              key={e.name}
              className="flex items-center gap-2 rounded-sm border border-white/5 bg-black/25 px-2.5 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rotate-45"
                style={{ background: e.color, boxShadow: `0 0 10px ${e.color}` }}
              />
              <span className="font-display shrink-0 text-[0.6rem] font-bold tracking-[0.16em] text-cyan-50/90">
                {e.name}
              </span>
              <span className="ml-auto hidden truncate text-[0.68rem] text-cyan-200/45 sm:block">
                {e.desc}
              </span>
            </div>
          ))}
        </div>

        <div className="rise-4 mt-3 flex flex-wrap items-center justify-center gap-2 text-[0.68rem] tracking-widest text-cyan-200/55 uppercase">
          <span className="chip !border-fuchsia-400/40 !bg-fuchsia-400/10 !text-fuchsia-200">
            ◆ tri-shot
          </span>
          <span className="chip">＋ hull</span>
          <span className="chip !border-amber-300/40 !bg-amber-300/10 !text-amber-200">
            ⚡ pulse charge
          </span>
        </div>

        <div className="rise-4 mt-5 border-t border-cyan-400/10 pt-4">
          <HighScoreTable scores={scores} compact />
        </div>

        <p className="mt-4 text-center text-[0.68rem] leading-relaxed text-cyan-200/35">
          Every 4 kills raises your chain multiplier — up to <b className="text-amber-200/80">×10</b>.
          Taking a hit halves it. Chain or die rich.
        </p>
      </div>
    </div>
  );
}

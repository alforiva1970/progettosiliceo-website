interface Props {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export default function PauseOverlay({ onResume, onRestart, onQuit }: Props) {
  return (
    <div className="overlay scanlines">
      <div className="animate-pop panel w-[min(92vw,420px)] p-6 text-center">
        <div className="label mb-1">system halted</div>
        <h2 className="font-display title-glow text-4xl font-black">
          <span className="grad-text">PAUSED</span>
        </h2>

        <div className="mt-5 grid gap-2">
          <button className="btn btn-primary w-full" onClick={onResume}>
            ▶ Resume
          </button>
          <button className="btn btn-ghost w-full" onClick={onRestart}>
            ⟳ Restart run
          </button>
          <button className="btn btn-ghost w-full !border-white/10 !text-cyan-200/60" onClick={onQuit}>
            ⌂ Main menu
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-left text-[0.72rem] text-cyan-200/55">
          <div className="rounded-sm border border-cyan-400/10 bg-black/25 px-2.5 py-2">
            <div className="label !text-[0.55rem]">move</div>
            WASD · arrows · drag
          </div>
          <div className="rounded-sm border border-cyan-400/10 bg-black/25 px-2.5 py-2">
            <div className="label !text-[0.55rem]">pulse</div>
            SPACE · ⚡ button
          </div>
          <div className="rounded-sm border border-cyan-400/10 bg-black/25 px-2.5 py-2">
            <div className="label !text-[0.55rem]">pause</div>
            ESC · P
          </div>
          <div className="rounded-sm border border-cyan-400/10 bg-black/25 px-2.5 py-2">
            <div className="label !text-[0.55rem]">restart</div>
            R
          </div>
        </div>
      </div>
    </div>
  );
}

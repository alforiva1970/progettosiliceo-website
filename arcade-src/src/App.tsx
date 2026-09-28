import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameEngine } from "./game/engine";
import type { GameOverPayload, GameState } from "./game/types";
import { bestOf, loadScores, type ScoreEntry } from "./game/scores";
import StartScreen from "./components/StartScreen";
import PauseOverlay from "./components/PauseOverlay";
import GameOverScreen from "./components/GameOverScreen";

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function IconSound({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>
      <path d="M4 10v4h3l4 4V6L7 10H4z" />
      {off ? (
        <path d="M15.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="1.8" fill="none" />
      ) : (
        <>
          <path
            d="M15.5 9.2a4 4 0 010 5.6M18 7.2a7.5 7.5 0 010 9.6"
            stroke="currentColor"
            strokeWidth="1.7"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const scoresRef = useRef<ScoreEntry[]>(loadScores());

  const [state, setState] = useState<GameState>("menu");
  const [result, setResult] = useState<GameOverPayload | null>(null);
  const [bestAtDeath, setBestAtDeath] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>(scoresRef.current);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, {
      onStateChange: setState,
      onGameOver: (payload) => {
        setBestAtDeath(bestOf(scoresRef.current));
        setResult(payload);
      },
      onMute: setMuted,
    });
    engine.setBestShown(bestOf(scoresRef.current));
    engineRef.current = engine;
    engine.attach();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const best = useMemo(() => bestOf(scores), [scores]);

  useEffect(() => {
    engineRef.current?.setBestShown(best);
  }, [best]);

  const handleStart = useCallback(() => engineRef.current?.start(), []);
  const handleRestart = useCallback(() => engineRef.current?.restart(), []);
  const handleResume = useCallback(() => engineRef.current?.resume(), []);
  const handlePause = useCallback(() => engineRef.current?.pause(), []);
  const handleMenu = useCallback(() => engineRef.current?.toMenu(), []);
  const handleMute = useCallback(() => engineRef.current?.toggleMute(), []);

  const handleSaved = useCallback((next: ScoreEntry[]) => {
    scoresRef.current = next;
    setScores(next);
  }, []);

  const inRun = state === "playing" || state === "paused";

  return (
    <div
      className="scanlines fixed inset-0 overflow-hidden bg-[#03030b]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* top-right session controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
        <div className="pointer-events-none select-none">
          {state === "menu" && (
            <div className="font-display hidden text-[0.6rem] tracking-[0.4em] text-cyan-300/30 sm:block">
              NEON VOID
            </div>
          )}
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            className="icon-btn"
            onClick={handleMute}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            title="Sound (M)"
          >
            <IconSound off={muted} />
          </button>
          {inRun && (
            <button
              className="icon-btn"
              onClick={handlePause}
              aria-label="Pause game"
              title="Pause (Esc)"
            >
              <IconPause />
            </button>
          )}
        </div>
      </div>

      {state === "menu" && <StartScreen onStart={handleStart} scores={scores} best={best} />}

      {state === "paused" && (
        <PauseOverlay onResume={handleResume} onRestart={handleRestart} onQuit={handleMenu} />
      )}

      {state === "gameover" && result && (
        <GameOverScreen
          result={result}
          scores={scores}
          isRecord={result.score > bestAtDeath && result.score > 0}
          onRestart={handleRestart}
          onMenu={handleMenu}
          onSaved={handleSaved}
        />
      )}

      {state === "menu" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-3">
          <div className="font-num text-[0.62rem] tracking-[0.25em] text-cyan-200/25 uppercase">
            headphones recommended · m toggles sound
          </div>
        </div>
      )}
    </div>
  );
}

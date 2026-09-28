export interface ScoreEntry {
  name: string;
  score: number;
  wave: number;
  date: number;
}

const KEY = "neonvoid.scores.v1";
export const MAX_SCORES = 8;

function isEntry(v: unknown): v is ScoreEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.score === "number" &&
    Number.isFinite(e.score) &&
    typeof e.name === "string" &&
    typeof e.wave === "number"
  );
}

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEntry)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES)
      .map((e) => ({ ...e, date: typeof e.date === "number" ? e.date : 0 }));
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const list = [...loadScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage may be unavailable (private mode) — keep playing anyway */
  }
  return list;
}

export function qualifies(list: ScoreEntry[], score: number): boolean {
  if (score <= 0) return false;
  if (list.length < MAX_SCORES) return true;
  return score > list[list.length - 1].score;
}

export function bestOf(list: ScoreEntry[]): number {
  return list.length > 0 ? list[0].score : 0;
}

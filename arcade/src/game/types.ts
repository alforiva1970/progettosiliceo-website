export type GameState = "menu" | "playing" | "paused" | "gameover";

export type EnemyKind = "grunt" | "shooter" | "dasher" | "splitter";

export type PowerupKind = "triple" | "shield" | "charge";

export interface Enemy {
  active: boolean;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  angle: number;
  spin: number;
  hitFlash: number;
  fireCd: number;
  chargeCd: number;
  charging: number;
  elite: boolean;
  scoreValue: number;
  spawnGrace: number;
}

export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  hostile: boolean;
  dmg: number;
  color: string;
}

/** kind: 0 = spark (streak), 1 = soft glow, 2 = debris chunk */
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  drag: number;
  color: string;
  kind: 0 | 1 | 2;
  rot: number;
  spin: number;
  gravity: number;
}

export interface FloatText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

export interface Powerup {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: PowerupKind;
  life: number;
  rot: number;
}

export interface Shockwave {
  active: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  width: number;
  color: string;
}

export interface Star {
  x: number;
  y: number;
  z: number;
  tw: number;
  size: number;
}

export interface GameOverPayload {
  score: number;
  wave: number;
  kills: number;
  bestCombo: number;
  timeAlive: number;
}

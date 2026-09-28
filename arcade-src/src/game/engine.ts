import type {
  Bullet,
  Enemy,
  EnemyKind,
  FloatText,
  GameOverPayload,
  GameState,
  Particle,
  Powerup,
  PowerupKind,
  Shockwave,
  Star,
} from "./types";
import { SoundKit } from "./audio";

const TAU = Math.PI * 2;

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
/** frame-rate independent easing factor for a given rate (per second) */
const approach = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

function angLerp(a: number, b: number, t: number): number {
  let d = (b - a + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return a + (d - Math.PI) * t;
}

interface EnemyStats {
  r: number;
  hp: number;
  speed: number;
  score: number;
  color: string;
  accent: string;
}

const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  grunt: { r: 14, hp: 1, speed: 96, score: 10, color: "#ff3d7f", accent: "#ffd0e0" },
  shooter: { r: 17, hp: 3, speed: 64, score: 25, color: "#ffb02e", accent: "#fff0c9" },
  dasher: { r: 15, hp: 2, speed: 78, score: 30, color: "#7cf86b", accent: "#e0ffd6" },
  splitter: { r: 27, hp: 6, speed: 48, score: 45, color: "#c46bff", accent: "#eed8ff" },
};

const PALETTE = {
  cyan: "#3ee9ff",
  ice: "#d9fbff",
  magenta: "#ff3d7f",
  amber: "#ffb02e",
  lime: "#7cf86b",
  violet: "#c46bff",
  white: "#ffffff",
};

export interface EngineCallbacks {
  onStateChange: (state: GameState) => void;
  onGameOver: (payload: GameOverPayload) => void;
  onMute: (muted: boolean) => void;
}

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  maxHp: number;
  inv: number;
  fireCd: number;
  aim: number;
  triple: number;
  alive: boolean;
  thrust: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private sound = new SoundKit();

  private dpr = 1;
  private w = 0;
  private h = 0;
  private bgGrad: CanvasGradient | null = null;
  private bgLayer: HTMLCanvasElement | null = null;
  private bgMargin = 0;

  private raf = 0;
  private last = 0;
  private running = false;

  state: GameState = "menu";

  // ---- feel / fx ----
  private timeScale = 1;
  private hitStop = 0;
  private slowmoTarget = 1;
  private shake = 0;
  private flashAlpha = 0;
  private flashColor = "255,70,100";
  private chroma = 0;

  // ---- run stats ----
  private score = 0;
  private kills = 0;
  private wave = 1;
  private combo = 0;
  private comboTimer = 0;
  private bestCombo = 0;
  private runTime = 0;
  private waveTimer = 0;
  private spawnTimer = 0;
  private diff = 0;

  private pulseCd = 0;
  private pulseMax = 7;
  private deathTimer = 0;
  private dying = false;
  private hintTimer = 0;

  private announceText = "";
  private announceSub = "";
  private announceLife = 0;

  private player: Player = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 13,
    hp: 3,
    maxHp: 3,
    inv: 0,
    fireCd: 0,
    aim: -Math.PI / 2,
    triple: 0,
    alive: true,
    thrust: 0,
  };

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private powerups: Powerup[] = [];
  private wavesFx: Shockwave[] = [];
  private stars: Star[] = [];
  private particleCursor = 0;

  private starDriftX = 0;
  private starDriftY = 0;
  private menuRot = 0;

  // ---- input ----
  private keys = new Set<string>();
  private pointer = {
    active: false,
    id: -1,
    ox: 0,
    oy: 0,
    x: 0,
    y: 0,
    pulseId: -1,
  };
  private touchUsed = false;
  private vignette: CanvasGradient | null = null;

  private glowCache = new Map<string, HTMLCanvasElement>();

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.cb = cb;
    this.touchUsed = window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
    this.resize();
    this.buildStars();
    this.resetRun();
  }

  // ------------------------------------------------------------------ setup

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.running = true;
    this.last = performance.now();
    this.resize();
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }

  private onResize = () => this.resize();

  private onVisibility = () => {
    if (document.hidden && this.state === "playing") this.pause();
  };

  private onBlur = () => {
    if (this.state === "playing") this.pause();
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(320, rect.width || window.innerWidth);
    this.h = Math.max(320, rect.height || window.innerHeight);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const g = this.ctx.createRadialGradient(
      this.w * 0.5,
      this.h * 0.45,
      0,
      this.w * 0.5,
      this.h * 0.5,
      Math.max(this.w, this.h) * 0.78,
    );
    g.addColorStop(0, "#141232");
    g.addColorStop(0.45, "#0a0a1e");
    g.addColorStop(1, "#03030b");
    this.bgGrad = g;

    const v = this.ctx.createRadialGradient(
      this.w / 2,
      this.h / 2,
      Math.min(this.w, this.h) * 0.34,
      this.w / 2,
      this.h / 2,
      Math.max(this.w, this.h) * 0.75,
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.74)");
    this.vignette = v;

    this.buildBgLayer();

    this.player.x = clamp(this.player.x, 30, this.w - 30);
    this.player.y = clamp(this.player.y, 30, this.h - 30);
    for (const e of this.enemies) {
      e.x = clamp(e.x, 20, this.w - 20);
      e.y = clamp(e.y, 20, this.h - 20);
    }
  }

  /**
   * The nebula + base gradient never change shape, so they are baked once per
   * resize into an offscreen layer. Each frame is then a single blit instead of
   * three huge additive sprite draws — a big win on mobile GPUs.
   */
  private buildBgLayer(): void {
    const m = Math.round(Math.min(this.w, this.h) * 0.07);
    this.bgMargin = m;
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round((this.w + m * 2) * this.dpr));
    c.height = Math.max(1, Math.round((this.h + m * 2) * this.dpr));
    const g = c.getContext("2d");
    if (!g) {
      this.bgLayer = null;
      return;
    }
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.translate(m, m);

    if (this.bgGrad) {
      g.fillStyle = this.bgGrad;
    } else {
      g.fillStyle = "#05060f";
    }
    g.fillRect(-m, -m, this.w + m * 2, this.h + m * 2);

    g.globalCompositeOperation = "lighter";
    const blobs: Array<[number, number, number, string, number]> = [
      [0.22, 0.28, 0.5, "#2a1b5e", 0.5],
      [0.8, 0.7, 0.55, "#0d3a54", 0.45],
      [0.48, 0.88, 0.36, "#4a1140", 0.34],
      [0.62, 0.16, 0.3, "#123a6b", 0.3],
    ];
    for (const [bx, by, br, color, alpha] of blobs) {
      this.paintGlow(g, bx * this.w, by * this.h, Math.max(this.w, this.h) * br, color, alpha * 0.5);
    }
    g.globalCompositeOperation = "source-over";
    this.bgLayer = c;
  }

  private paintGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    color: string,
    alpha: number,
  ): void {
    const s = this.glowSprite(color);
    ctx.globalAlpha = alpha;
    ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  }

  private buildStars(): void {
    this.stars = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: rand(0.15, 1),
        tw: Math.random() * TAU,
        size: rand(0.6, 2.1),
      });
    }
  }

  // ------------------------------------------------------------- lifecycle

  private resetRun(): void {
    this.score = 0;
    this.kills = 0;
    this.wave = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.runTime = 0;
    this.waveTimer = 26;
    this.spawnTimer = 0.4;
    this.diff = 0;
    this.pulseCd = 0;
    this.deathTimer = 0;
    this.dying = false;
    this.hintTimer = 6.5;
    this.timeScale = 1;
    this.slowmoTarget = 1;
    this.hitStop = 0;
    this.shake = 0;
    this.flashAlpha = 0;
    this.chroma = 0;

    this.player.x = this.w / 2;
    this.player.y = this.h * 0.68;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hp = 3;
    this.player.maxHp = 3;
    this.player.inv = 1.2;
    this.player.fireCd = 0;
    this.player.aim = -Math.PI / 2;
    this.player.triple = 0;
    this.player.alive = true;

    this.enemies.length = 0;
    this.bullets.length = 0;
    this.particles.length = 0;
    this.texts.length = 0;
    this.powerups.length = 0;
    this.wavesFx.length = 0;

    this.announceText = "WAVE 1";
    this.announceSub = "SURVIVE";
    this.announceLife = 2.2;

    // opening volley so the action starts instantly — close in on the player
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + rand(-1.6, 1.6);
      const d = Math.min(this.w, this.h) * rand(0.42, 0.55);
      this.spawnEnemyAt(
        this.w / 2 + Math.cos(a) * d,
        this.h / 2 + Math.sin(a) * d,
        "grunt",
        false,
      );
      const last = this.enemies[this.enemies.length - 1];
      const inward = Math.atan2(this.player.y - last.y, this.player.x - last.x);
      last.vx = Math.cos(inward) * 150;
      last.vy = Math.sin(inward) * 150;
    }
    this.burst(this.player.x, this.player.y, 22, PALETTE.cyan, 260, 2.4, 0.5);
  }

  start(): void {
    this.sound.unlock();
    this.resetRun();
    this.setState("playing");
    this.sound.ui();
  }

  restart(): void {
    this.sound.unlock();
    this.resetRun();
    this.setState("playing");
    this.sound.ui();
  }

  toMenu(): void {
    this.setState("menu");
    this.sound.ui();
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.setState("paused");
    this.sound.ui();
  }

  resume(): void {
    if (this.state !== "paused") return;
    this.setState("playing");
    this.last = performance.now();
    this.sound.ui();
  }

  togglePause(): void {
    if (this.state === "playing") this.pause();
    else if (this.state === "paused") this.resume();
  }

  toggleMute(): boolean {
    this.sound.setMuted(!this.sound.muted);
    this.cb.onMute(this.sound.muted);
    if (!this.sound.muted) this.sound.unlock();
    return this.sound.muted;
  }

  private setState(s: GameState): void {
    if (this.state === s) return;
    this.state = s;
    this.cb.onStateChange(s);
  }

  // ---------------------------------------------------------------- input

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (
      ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(k)
    ) {
      e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(k);

    if (k === "m") {
      this.toggleMute();
      return;
    }
    if (k === "escape" || k === "p") {
      this.togglePause();
      return;
    }
    if (k === "enter") {
      if (this.state === "menu") this.start();
      else if (this.state === "gameover") this.restart();
      return;
    }
    if (k === "r") {
      if (this.state === "gameover" || this.dying) this.restart();
      else if (this.state === "paused") this.restart();
      return;
    }
    if (k === " " || k === "spacebar") {
      if (this.state === "menu") this.start();
      else if (this.state === "gameover") this.restart();
      else if (this.state === "playing") this.doPulse();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent) => {
    this.sound.unlock();
    if (e.pointerType !== "mouse") this.touchUsed = true;
    if (this.state !== "playing") return;
    const { x, y } = this.toLocal(e);

    if (this.inPulseBtn(x, y)) {
      this.pointer.pulseId = e.pointerId;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.doPulse();
      return;
    }
    if (!this.pointer.active) {
      this.pointer.active = true;
      this.pointer.id = e.pointerId;
      this.pointer.ox = x;
      this.pointer.oy = y;
      this.pointer.x = x;
      this.pointer.y = y;
      this.canvas.setPointerCapture?.(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.pointer.id !== e.pointerId) return;
    const { x, y } = this.toLocal(e);
    this.pointer.x = x;
    this.pointer.y = y;
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointer.id === e.pointerId) {
      this.pointer.active = false;
      this.pointer.id = -1;
    }
    if (this.pointer.pulseId === e.pointerId) this.pointer.pulseId = -1;
  };

  private toLocal(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private pulseBtn(): { x: number; y: number; r: number } {
    return { x: this.w - 74, y: this.h - 74, r: 46 };
  }

  private inPulseBtn(x: number, y: number): boolean {
    const b = this.pulseBtn();
    const dx = x - b.x;
    const dy = y - b.y;
    return dx * dx + dy * dy < (b.r + 14) * (b.r + 14);
  }

  // ----------------------------------------------------------------- loop

  private frame = (now: number) => {
    if (!this.running) return;
    const realDt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(realDt);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private update(realDt: number): void {
    // ---- global time manipulation (hit-stop + slow motion) ----
    this.hitStop = Math.max(0, this.hitStop - realDt);
    this.slowmoTarget = this.dying ? 0.28 : this.slowmoTarget;
    const target = this.hitStop > 0 ? 0.06 : this.slowmoTarget;
    this.timeScale += (target - this.timeScale) * approach(16, realDt);
    const dt = realDt * this.timeScale;

    this.shake *= Math.exp(-6 * realDt);
    this.flashAlpha = Math.max(0, this.flashAlpha - realDt * 2.6);
    this.chroma = Math.max(0, this.chroma - realDt * 3);
    this.announceLife = Math.max(0, this.announceLife - realDt);
    this.menuRot += realDt * 0.25;

    this.updateStars(realDt);
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.updateShockwaves(dt);

    if (this.state === "playing") {
      if (this.dying) {
        this.deathTimer -= realDt;
        this.slowmoTarget = 0.28;
        if (this.deathTimer <= 0) this.finishRun();
      } else {
        this.runTime += dt;
        this.score += dt * 3.2;
        this.hintTimer = Math.max(0, this.hintTimer - realDt);
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateBullets(dt);
        this.updatePowerups(dt);
        this.collide();
        this.updateSpawning(dt);
        this.updateCombo(dt);
        this.pulseCd = Math.min(this.pulseMax, this.pulseCd + dt);
      }
    }

    this.compactAll();
  }

  private updateStars(dt: number): void {
    const p = this.player;
    const drift = this.state === "playing" && !this.dying ? 1 : 0.25;
    this.starDriftX = (this.starDriftX - p.vx * 0.055 * dt * drift) % 1;
    this.starDriftY = (this.starDriftY - p.vy * 0.055 * dt * drift) % 1;
    for (const s of this.stars) s.tw += dt * (1 + s.z * 3);
  }

  private readKeyboardMove(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    return { x, y };
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    const kb = this.readKeyboardMove();
    let ix = kb.x;
    let iy = kb.y;

    if (this.pointer.active) {
      const dx = this.pointer.x - this.pointer.ox;
      const dy = this.pointer.y - this.pointer.oy;
      const d = Math.hypot(dx, dy);
      if (d > 7) {
        const k = Math.min(1, d / 62);
        ix = (dx / d) * k;
        iy = (dy / d) * k;
      }
    }

    const mag = Math.hypot(ix, iy);
    p.thrust = lerp(p.thrust, mag, approach(12, dt));

    const ACCEL = 2500;
    const MAX = 470;
    p.vx += ix * ACCEL * dt;
    p.vy += iy * ACCEL * dt;
    const damp = Math.exp(-(mag > 0.05 ? 1.1 : 6.5) * dt);
    p.vx *= damp;
    p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > MAX) {
      p.vx = (p.vx / sp) * MAX;
      p.vy = (p.vy / sp) * MAX;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const pad = p.r + 3;
    if (p.x < pad) {
      p.x = pad;
      p.vx = Math.abs(p.vx) * 0.35;
      this.spark(p.x, p.y, PALETTE.cyan, 4, 120);
    } else if (p.x > this.w - pad) {
      p.x = this.w - pad;
      p.vx = -Math.abs(p.vx) * 0.35;
      this.spark(p.x, p.y, PALETTE.cyan, 4, 120);
    }
    if (p.y < pad) {
      p.y = pad;
      p.vy = Math.abs(p.vy) * 0.35;
      this.spark(p.x, p.y, PALETTE.cyan, 4, 120);
    } else if (p.y > this.h - pad) {
      p.y = this.h - pad;
      p.vy = -Math.abs(p.vy) * 0.35;
      this.spark(p.x, p.y, PALETTE.cyan, 4, 120);
    }

    p.inv = Math.max(0, p.inv - dt);
    p.triple = Math.max(0, p.triple - dt);
    p.fireCd -= dt;

    // engine trail
    if (mag > 0.1 && Math.random() < 0.85) {
      const back = Math.atan2(-p.vy, -p.vx) + rand(-0.4, 0.4);
      this.addParticle({
        x: p.x + Math.cos(back) * 12,
        y: p.y + Math.sin(back) * 12,
        vx: Math.cos(back) * rand(40, 130) + p.vx * 0.2,
        vy: Math.sin(back) * rand(40, 130) + p.vy * 0.2,
        life: rand(0.18, 0.36),
        maxLife: 0.36,
        size: rand(1.6, 3.2),
        drag: 3.2,
        color: Math.random() < 0.4 ? PALETTE.ice : PALETTE.cyan,
        kind: 1,
        rot: 0,
        spin: 0,
        gravity: 0,
      });
    }

    // ---- auto aim + auto fire ----
    let target: Enemy | null = null;
    let bestD = 820 * 820;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        target = e;
      }
    }

    if (target) {
      const want = Math.atan2(target.y - p.y, target.x - p.x);
      p.aim = angLerp(p.aim, want, approach(18, dt));
      if (p.fireCd <= 0) {
        this.fire();
        p.fireCd = p.triple > 0 ? 0.115 : 0.16;
      }
    } else if (sp > 30) {
      p.aim = angLerp(p.aim, Math.atan2(p.vy, p.vx), approach(4, dt));
    }
  }

  private fire(): void {
    const p = this.player;
    const spread = p.triple > 0 ? [-0.2, 0, 0.2] : [0];
    const speed = 720;
    for (const off of spread) {
      const a = p.aim + off + rand(-0.02, 0.02);
      this.addBullet(
        p.x + Math.cos(a) * 16,
        p.y + Math.sin(a) * 16,
        Math.cos(a) * speed + p.vx * 0.25,
        Math.sin(a) * speed + p.vy * 0.25,
        1,
        p.triple > 0 ? PALETTE.ice : PALETTE.cyan,
      );
    }
    p.vx -= Math.cos(p.aim) * 26;
    p.vy -= Math.sin(p.aim) * 26;
    this.burst(p.x + Math.cos(p.aim) * 18, p.y + Math.sin(p.aim) * 18, 3, PALETTE.ice, 150, 1.4, 0.14);
    this.sound.shoot();
  }

  private doPulse(): void {
    if (this.state !== "playing" || this.dying) return;
    if (this.pulseCd < this.pulseMax) return;
    const p = this.player;
    this.pulseCd = 0;
    this.addShockwave(p.x, p.y, 460, 0.55, 16, PALETTE.cyan);
    this.addShockwave(p.x, p.y, 300, 0.4, 8, PALETTE.ice);
    this.shakeBy(20);
    this.flash(90, 220, 255, 0.35);
    this.hitStop = 0.09;
    this.slowmoTarget = 0.55;
    window.setTimeout(() => {
      if (!this.dying) this.slowmoTarget = 1;
    }, 160);
    this.addText(p.x, p.y - 46, "PULSE!", PALETTE.cyan, 22);
    this.sound.pulse();
    this.burst(p.x, p.y, 34, PALETTE.cyan, 420, 2.6, 0.5);

    for (const b of this.bullets) {
      if (!b.active || !b.hostile) continue;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      if (dx * dx + dy * dy < 420 * 420) {
        b.active = false;
        this.burst(b.x, b.y, 4, PALETTE.amber, 160, 1.4, 0.22);
      }
    }
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 420) {
        this.damageEnemy(e, 2, dx / (d || 1), dy / (d || 1), true);
      }
    }
  }

  // ------------------------------------------------------------- enemies

  private spawnEnemyAt(x: number, y: number, kind: EnemyKind, elite: boolean): void {
    const st = ENEMY_STATS[kind];
    const e: Enemy = {
      active: true,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      r: st.r * (elite ? 1.32 : 1),
      hp: st.hp * (elite ? 2 : 1),
      maxHp: st.hp * (elite ? 2 : 1),
      angle: Math.atan2(this.h / 2 - y, this.w / 2 - x),
      spin: rand(-2, 2),
      hitFlash: 0,
      fireCd: rand(0.8, 2.2),
      chargeCd: rand(1.4, 3),
      charging: 0,
      elite,
      scoreValue: st.score * (elite ? 2 : 1),
      spawnGrace: 0.45,
    };
    this.enemies.push(e);
    this.addShockwave(x, y, st.r * 4.5, 0.4, 5, st.color);
    this.burst(x, y, 8, st.color, 170, 1.8, 0.3);
  }

  private updateSpawning(dt: number): void {
    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      this.wave += 1;
      this.waveTimer = 26;
      this.diff = Math.min(1, this.diff + 0.11);
      this.announceText = `WAVE ${this.wave}`;
      this.announceSub = this.wave % 5 === 0 ? "ELITES INBOUND" : "HOSTILES RISING";
      this.announceLife = 2.2;
      this.sound.wave();
      const burstCount = 2 + Math.floor(this.wave / 2);
      for (let i = 0; i < burstCount; i++) this.spawnFromEdge();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const maxAlive = Math.min(28, 6 + Math.floor(this.wave * 1.6));
      let alive = 0;
      for (const e of this.enemies) if (e.active) alive++;
      if (alive < maxAlive) {
        const count = 1 + (Math.random() < 0.25 + this.diff * 0.3 ? 1 : 0);
        for (let i = 0; i < count; i++) this.spawnFromEdge();
      }
      const base = Math.max(0.42, 1.25 - this.diff * 0.62);
      this.spawnTimer = rand(base * 0.65, base * 1.35);
    }
  }

  private spawnFromEdge(): void {
    const margin = 60;
    const side = (Math.random() * 4) | 0;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = rand(margin, this.w - margin);
      y = -margin;
    } else if (side === 1) {
      x = this.w + margin;
      y = rand(margin, this.h - margin);
    } else if (side === 2) {
      x = rand(margin, this.w - margin);
      y = this.h + margin;
    } else {
      x = -margin;
      y = rand(margin, this.h - margin);
    }

    const w = Math.random();
    let kind: EnemyKind = "grunt";
    if (this.wave >= 2 && w < 0.26) kind = "shooter";
    else if (this.wave >= 3 && w < 0.42) kind = "dasher";
    else if (this.wave >= 4 && w < 0.52) kind = "splitter";

    const eliteChance = clamp(0.02 + this.wave * 0.022, 0, 0.24);
    this.spawnEnemyAt(x, y, kind, Math.random() < eliteChance);
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.spawnGrace = Math.max(0, e.spawnGrace - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt * 4);
      e.angle += e.spin * dt * (e.kind === "splitter" ? 0.6 : 1.4);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = dx / d;
      const ny = dy / d;
      const st = ENEMY_STATS[e.kind];
      const speed = st.speed * (1 + this.diff * 0.5) * (e.elite ? 1.15 : 1);

      if (e.kind === "grunt") {
        const wob = Math.sin(this.runTime * 3 + e.x * 0.01) * 0.35;
        const tx = nx * Math.cos(wob) - ny * Math.sin(wob);
        const ty = nx * Math.sin(wob) + ny * Math.cos(wob);
        e.vx = lerp(e.vx, tx * speed, approach(3.4, dt));
        e.vy = lerp(e.vy, ty * speed, approach(3.4, dt));
      } else if (e.kind === "shooter") {
        const want = 270;
        const radial = d < want - 40 ? -1 : d > want + 60 ? 1 : 0;
        const tang = e.spin >= 0 ? 1 : -1;
        const tx = nx * radial + -ny * tang;
        const ty = ny * radial + nx * tang;
        const tm = Math.hypot(tx, ty) || 1;
        e.vx = lerp(e.vx, (tx / tm) * speed, approach(2.6, dt));
        e.vy = lerp(e.vy, (ty / tm) * speed, approach(2.6, dt));
        e.fireCd -= dt;
        if (e.fireCd <= 0 && d < 620) {
          e.fireCd = Math.max(1.1, 2.4 - this.diff * 0.9);
          const base = Math.atan2(dy, dx);
          for (const off of [-0.22, 0, 0.22]) {
            const a = base + off;
            this.addBullet(
              e.x + Math.cos(a) * e.r,
              e.y + Math.sin(a) * e.r,
              Math.cos(a) * 250,
              Math.sin(a) * 250,
              1,
              PALETTE.amber,
              true,
            );
          }
        }
      } else if (e.kind === "dasher") {
        if (e.charging > 0) {
          e.charging -= dt;
        } else {
          e.chargeCd -= dt;
          e.vx = lerp(e.vx, nx * speed * 0.55, approach(3, dt));
          e.vy = lerp(e.vy, ny * speed * 0.55, approach(3, dt));
          if (e.chargeCd <= 0 && d < 560) {
            e.charging = 0.85;
            e.chargeCd = Math.max(1.5, 3.2 - this.diff);
            const dash = 560 * (1 + this.diff * 0.3);
            e.vx = nx * dash;
            e.vy = ny * dash;
            this.burst(e.x, e.y, 8, PALETTE.lime, 200, 1.8, 0.3);
          }
        }
      } else {
        e.vx = lerp(e.vx, nx * speed, approach(1.8, dt));
        e.vy = lerp(e.vy, ny * speed, approach(1.8, dt));
      }

      // separation so packs surround instead of stacking
      if (e.kind !== "splitter") {
        for (const o of this.enemies) {
          if (o === e || !o.active) continue;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const od = ox * ox + oy * oy;
          const min = (e.r + o.r) * 1.05;
          if (od > 0.01 && od < min * min) {
            const l = Math.sqrt(od);
            const push = ((min - l) / l) * 90;
            e.vx += (ox / l) * push * dt * 6;
            e.vy += (oy / l) * push * dt * 6;
          }
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x < -140 || e.x > this.w + 140 || e.y < -140 || e.y > this.h + 140) {
        const ang = Math.atan2(this.h / 2 - e.y, this.w / 2 - e.x);
        e.x = clamp(e.x, -120, this.w + 120);
        e.y = clamp(e.y, -120, this.h + 120);
        e.vx = Math.cos(ang) * speed;
        e.vy = Math.sin(ang) * speed;
      }
      e.x = clamp(e.x, -130, this.w + 130);
      e.y = clamp(e.y, -130, this.h + 130);

      if (e.kind === "dasher" && e.charging > 0 && Math.random() < 0.7) {
        this.addParticle({
          x: e.x,
          y: e.y,
          vx: -e.vx * 0.12,
          vy: -e.vy * 0.12,
          life: 0.24,
          maxLife: 0.24,
          size: 2.2,
          drag: 3,
          color: PALETTE.lime,
          kind: 1,
          rot: 0,
          spin: 0,
          gravity: 0,
        });
      }
    }
  }

  private damageEnemy(
    e: Enemy,
    dmg: number,
    kx: number,
    ky: number,
    fromPulse = false,
  ): void {
    e.hp -= dmg;
    e.hitFlash = 1;
    e.vx += kx * (fromPulse ? 340 : 90);
    e.vy += ky * (fromPulse ? 340 : 90);
    if (e.hp <= 0) {
      this.killEnemy(e);
    } else {
      this.burst(e.x, e.y, 4, ENEMY_STATS[e.kind].color, 150, 1.5, 0.2);
    }
  }

  private killEnemy(e: Enemy): void {
    e.active = false;
    this.kills += 1;
    const st = ENEMY_STATS[e.kind];
    const mult = this.multiplier();
    const gained = Math.round(e.scoreValue * mult);
    this.score += gained;

    this.combo += 1;
    this.comboTimer = 2.6;
    this.bestCombo = Math.max(this.bestCombo, this.combo);

    const big = e.kind === "splitter" || e.elite;
    this.explode(e.x, e.y, st.color, big);
    this.shakeBy(big ? 13 : 5.5);
    this.hitStop = Math.max(this.hitStop, big ? 0.075 : 0.028);
    this.addText(e.x, e.y - 12, `+${gained}`, big ? PALETTE.white : st.accent, big ? 20 : 15);
    this.sound.explode(big);

    if (this.combo > 0 && this.combo % 10 === 0) {
      this.addText(this.player.x, this.player.y - 58, `x${this.multiplier()} COMBO`, PALETTE.amber, 20);
      this.flash(255, 190, 80, 0.22);
    }
    if (this.combo > 0 && this.combo % 4 === 0) this.sound.combo(this.combo);

    if (e.kind === "splitter") {
      for (let i = 0; i < 3; i++) {
        const a = rand(0, TAU);
        const px = e.x + Math.cos(a) * 18;
        const py = e.y + Math.sin(a) * 18;
        this.spawnEnemyAt(px, py, "grunt", false);
        const child = this.enemies[this.enemies.length - 1];
        child.vx = Math.cos(a) * 190;
        child.vy = Math.sin(a) * 190;
      }
    }

    if (Math.random() < 0.075) this.dropPowerup(e.x, e.y);
  }

  private multiplier(): number {
    return Math.min(10, 1 + Math.floor(this.combo / 4));
  }

  // -------------------------------------------------------------- bullets

  private addBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    dmg: number,
    color: string,
    hostile = false,
  ): void {
    const b: Bullet = {
      active: true,
      x,
      y,
      vx,
      vy,
      r: hostile ? 6 : 4.5,
      life: hostile ? 5.2 : 1.15,
      hostile,
      dmg,
      color,
    };
    this.bullets.push(b);
  }

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (
        b.life <= 0 ||
        b.x < -40 ||
        b.y < -40 ||
        b.x > this.w + 40 ||
        b.y > this.h + 40
      ) {
        b.active = false;
        continue;
      }
      if (b.hostile && Math.random() < 0.35) {
        this.addParticle({
          x: b.x,
          y: b.y,
          vx: rand(-20, 20),
          vy: rand(-20, 20),
          life: 0.2,
          maxLife: 0.2,
          size: 1.6,
          drag: 3,
          color: PALETTE.amber,
          kind: 1,
          rot: 0,
          spin: 0,
          gravity: 0,
        });
      }
    }
  }

  // ------------------------------------------------------------- powerups

  private dropPowerup(x: number, y: number): void {
    const r = Math.random();
    const kind: PowerupKind = r < 0.45 ? "triple" : r < 0.78 ? "shield" : "charge";
    const a = rand(0, TAU);
    const pu: Powerup = {
      active: true,
      x,
      y,
      vx: Math.cos(a) * 60,
      vy: Math.sin(a) * 60,
      r: 15,
      kind,
      life: 11,
      rot: 0,
    };
    this.powerups.push(pu);
    this.addShockwave(x, y, 70, 0.4, 4, kind === "triple" ? PALETTE.magenta : kind === "shield" ? PALETTE.cyan : PALETTE.amber);
  }

  private updatePowerups(dt: number): void {
    for (const pu of this.powerups) {
      if (!pu.active) continue;
      pu.life -= dt;
      pu.rot += dt * 2.2;
      pu.vx *= Math.exp(-1.6 * dt);
      pu.vy *= Math.exp(-1.6 * dt);
      pu.x = clamp(pu.x + pu.vx * dt, 20, this.w - 20);
      pu.y = clamp(pu.y + pu.vy * dt, 20, this.h - 20);
      if (pu.life <= 0) pu.active = false;
    }
  }

  private applyPowerup(pu: Powerup): void {
    pu.active = false;
    const p = this.player;
    this.sound.power();
    this.flash(120, 255, 220, 0.3);
    this.addShockwave(pu.x, pu.y, 120, 0.4, 6, PALETTE.ice);
    this.burst(pu.x, pu.y, 18, PALETTE.ice, 240, 2.2, 0.45);
    if (pu.kind === "triple") {
      p.triple = 12;
      this.addText(pu.x, pu.y - 24, "TRI-SHOT", PALETTE.magenta, 20);
    } else if (pu.kind === "shield") {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      p.inv = Math.max(p.inv, 0.9);
      this.addText(pu.x, pu.y - 24, "HULL +1", PALETTE.cyan, 20);
    } else {
      this.pulseCd = this.pulseMax;
      this.addText(pu.x, pu.y - 24, "PULSE READY", PALETTE.amber, 20);
    }
  }

  // ------------------------------------------------------------ collision

  private collide(): void {
    const p = this.player;

    for (const b of this.bullets) {
      if (!b.active) continue;
      if (b.hostile) {
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const rr = b.r + p.r;
        if (dx * dx + dy * dy < rr * rr) {
          b.active = false;
          this.damagePlayer();
          continue;
        }
      } else {
        for (const e of this.enemies) {
          if (!e.active) continue;
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const rr = b.r + e.r;
          if (dx * dx + dy * dy < rr * rr) {
            b.active = false;
            this.burst(b.x, b.y, 3, PALETTE.ice, 130, 1.3, 0.16);
            this.damageEnemy(e, b.dmg, b.vx, b.vy);
            break;
          }
        }
      }
    }

    if (!p.alive) return;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const rr = e.r + p.r;
      if (dx * dx + dy * dy < rr * rr) {
        const d = Math.hypot(dx, dy) || 1;
        const squishy = e.kind === "grunt" || e.kind === "dasher";
        if (squishy) {
          this.killEnemy(e);
        } else {
          this.damageEnemy(e, 1, dx / d, dy / d);
        }
        this.damagePlayer();
      }
    }

    for (const pu of this.powerups) {
      if (!pu.active) continue;
      const dx = pu.x - p.x;
      const dy = pu.y - p.y;
      const rr = pu.r + p.r + 8;
      if (dx * dx + dy * dy < rr * rr) this.applyPowerup(pu);
    }
  }

  private damagePlayer(): void {
    const p = this.player;
    if (p.inv > 0 || this.dying) return;
    p.hp -= 1;
    p.inv = 1.7;
    this.combo = Math.floor(this.combo / 2);
    this.comboTimer = Math.min(this.comboTimer, 1.2);
    this.shakeBy(28);
    this.flash(255, 70, 100, 0.8);
    this.chroma = 1;
    this.hitStop = 0.1;
    this.slowmoTarget = 0.35;
    window.setTimeout(() => {
      if (!this.dying) this.slowmoTarget = 1;
    }, 320);
    this.explode(p.x, p.y, PALETTE.cyan, true);
    this.sound.hit();

    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 220) {
        e.vx += (dx / d) * 420;
        e.vy += (dy / d) * 420;
      }
    }

    if (p.hp <= 0) this.startDeath();
  }

  private startDeath(): void {
    const p = this.player;
    p.alive = false;
    this.dying = true;
    this.deathTimer = 1.15;
    this.slowmoTarget = 0.28;
    this.shakeBy(40);
    this.flash(255, 120, 160, 0.9);
    this.explode(p.x, p.y, PALETTE.ice, true);
    this.explode(p.x, p.y, PALETTE.magenta, true);
    this.addShockwave(p.x, p.y, 620, 0.9, 22, PALETTE.ice);
    this.sound.over();
  }

  private finishRun(): void {
    this.dying = false;
    this.slowmoTarget = 1;
    this.timeScale = 1;
    this.setState("gameover");
    this.cb.onGameOver({
      score: Math.floor(this.score),
      wave: this.wave,
      kills: this.kills,
      bestCombo: this.bestCombo,
      timeAlive: Math.floor(this.runTime),
    });
  }

  private updateCombo(dt: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  // ------------------------------------------------------------------ fx

  private addParticle(p: Omit<Particle, "active">): void {
    if (this.particles.length < 900) {
      this.particles.push({ ...p, active: true });
      return;
    }
    const i = this.particleCursor % this.particles.length;
    this.particles[i] = { ...p, active: true };
    this.particleCursor++;
  }

  private burst(
    x: number,
    y: number,
    count: number,
    color: string,
    speed: number,
    size: number,
    life: number,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.25, speed);
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(life * 0.5, life),
        maxLife: life,
        size: rand(size * 0.6, size * 1.4),
        drag: 2.6,
        color: Math.random() < 0.25 ? PALETTE.white : color,
        kind: Math.random() < 0.72 ? 0 : 1,
        rot: 0,
        spin: 0,
        gravity: 0,
      });
    }
  }

  private explode(x: number, y: number, color: string, big: boolean): void {
    const n = big ? 46 : 16;
    this.burst(x, y, n, color, big ? 460 : 260, big ? 3.2 : 2.2, big ? 0.85 : 0.5);
    for (let i = 0; i < (big ? 10 : 4); i++) {
      const a = rand(0, TAU);
      const s = rand(60, big ? 300 : 180);
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.4, 0.9),
        maxLife: 0.9,
        size: rand(2.5, big ? 6 : 4),
        drag: 1.6,
        color,
        kind: 2,
        rot: rand(0, TAU),
        spin: rand(-9, 9),
        gravity: 0,
      });
    }
    this.addShockwave(x, y, big ? 240 : 110, big ? 0.5 : 0.3, big ? 10 : 5, color);
  }

  private spark(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      this.addParticle({
        x,
        y,
        vx: Math.cos(a) * rand(40, speed),
        vy: Math.sin(a) * rand(40, speed),
        life: rand(0.12, 0.3),
        maxLife: 0.3,
        size: rand(1, 2),
        drag: 4,
        color,
        kind: 0,
        rot: 0,
        spin: 0,
        gravity: 0,
      });
    }
  }

  private addShockwave(
    x: number,
    y: number,
    maxR: number,
    life: number,
    width: number,
    color: string,
  ): void {
    const s: Shockwave = { active: true, x, y, r: 0, maxR, life, maxLife: life, width, color };
    this.wavesFx.push(s);
  }

  private addText(x: number, y: number, text: string, color: string, size: number): void {
    if (this.texts.length > 40) return;
    const t: FloatText = {
      active: true,
      x,
      y,
      vy: -46,
      life: 0.95,
      maxLife: 0.95,
      text,
      color,
      size,
    };
    this.texts.push(t);
  }

  private shakeBy(mag: number): void {
    this.shake = Math.min(46, this.shake + mag);
  }

  private flash(r: number, g: number, b: number, a: number): void {
    this.flashColor = `${r},${g},${b}`;
    this.flashAlpha = Math.max(this.flashAlpha, a);
  }

  private updateParticles(dt: number): void {
    const arr = this.particles;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  private updateTexts(dt: number): void {
    for (const t of this.texts) {
      if (!t.active) continue;
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2.4 * dt);
      if (t.life <= 0) t.active = false;
    }
  }

  private updateShockwaves(dt: number): void {
    for (const s of this.wavesFx) {
      if (!s.active) continue;
      s.life -= dt;
      const t = 1 - s.life / s.maxLife;
      s.r = s.maxR * (1 - Math.pow(1 - t, 2.4));
      if (s.life <= 0) s.active = false;
    }
  }

  private compact<T extends { active: boolean }>(arr: T[]): void {
    let w = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i].active) arr[w++] = arr[i];
    arr.length = w;
  }

  private compactAll(): void {
    this.compact(this.enemies);
    this.compact(this.bullets);
    this.compact(this.particles);
    this.compact(this.texts);
    this.compact(this.powerups);
    this.compact(this.wavesFx);
  }

  // ---------------------------------------------------------------- render

  private glowSprite(color: string): HTMLCanvasElement {
    let c = this.glowCache.get(color);
    if (!c) {
      c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      const g = c.getContext("2d");
      if (g) {
        const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grd.addColorStop(0, rgba(color, 1));
        grd.addColorStop(0.3, rgba(color, 0.42));
        grd.addColorStop(0.65, rgba(color, 0.12));
        grd.addColorStop(1, rgba(color, 0));
        g.fillStyle = grd;
        g.fillRect(0, 0, 64, 64);
      }
      this.glowCache.set(color, c);
    }
    return c;
  }

  private drawGlow(x: number, y: number, radius: number, color: string, alpha: number): void {
    const s = this.glowSprite(color);
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
    this.ctx.globalAlpha = 1;
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // background (baked nebula layer, gently breathing)
    if (this.bgLayer) {
      const m = this.bgMargin;
      const drift = Math.sin(this.menuRot * 0.35) * m * 0.5;
      const drift2 = Math.cos(this.menuRot * 0.27) * m * 0.5;
      ctx.drawImage(
        this.bgLayer,
        -m + drift,
        -m + drift2,
        w + m * 2,
        h + m * 2,
      );
    } else if (this.bgGrad) {
      ctx.fillStyle = this.bgGrad;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#05060f";
      ctx.fillRect(0, 0, w, h);
    }

    ctx.save();
    if (this.shake > 0.4) {
      const s = this.shake;
      ctx.translate(rand(-s, s) * 0.5, rand(-s, s) * 0.5);
    }

    this.drawStars();
    this.drawGrid();

    ctx.globalCompositeOperation = "lighter";
    this.drawPowerups();
    this.drawShockwaves();
    this.drawParticles();
    this.drawEnemyBullets();
    this.drawEnemies();
    this.drawBullets();
    if (this.state === "playing" && this.player.alive) this.drawPlayer();
    ctx.globalCompositeOperation = "source-over";
    this.drawTexts();
    ctx.restore();

    this.drawVignette();
    if (this.flashAlpha > 0.001) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.flashAlpha * 0.55})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.state === "playing" || this.state === "paused") this.drawHud();
    if (this.state === "playing") this.drawTouchControls();
    if (this.state === "menu") this.drawMenuDecor();
  }

  /** slow orbiting satellites so the title screen feels alive */
  private drawMenuDecor(): void {
    const ctx = this.ctx;
    const cx = this.w / 2;
    const cy = this.h / 2;
    const base = Math.min(this.w, this.h);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const rings: Array<[number, number, number, string]> = [
      [base * 0.22, 0.6, 4, PALETTE.cyan],
      [base * 0.3, -0.42, 3, PALETTE.magenta],
      [base * 0.38, 0.3, 2.5, PALETTE.violet],
    ];
    for (const [r, speed, size, color] of rings) {
      const a = this.menuRot * speed;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = rgba(color, 0.18);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 9]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * 0.98;
      this.drawGlow(x, y, size * 6, color, 0.55);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawStars(): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "lighter";
    for (const s of this.stars) {
      let x = (s.x + this.starDriftX * s.z) % 1;
      let y = (s.y + this.starDriftY * s.z) % 1;
      if (x < 0) x += 1;
      if (y < 0) y += 1;
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(s.tw));
      ctx.globalAlpha = (0.2 + s.z * 0.7) * tw;
      ctx.fillStyle = s.z > 0.75 ? "#cfe9ff" : "#8fb6d8";
      const size = s.size * (0.7 + s.z * 0.6);
      ctx.fillRect(x * this.w, y * this.h, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    const cx = this.w / 2;
    const cy = this.h / 2;
    const maxR = Math.hypot(cx, cy);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(80,140,255,0.07)";
    ctx.lineWidth = 1;
    for (let i = 1; i <= 7; i++) {
      const r = (maxR / 7) * i;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }
    const spokes = 16;
    const rot = this.menuRot * 0.15;
    for (let i = 0; i < spokes; i++) {
      const a = rot + (i / spokes) * TAU;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * maxR * 0.14, cy + Math.sin(a) * maxR * 0.14);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    // rotating core ring
    ctx.strokeStyle = "rgba(62,233,255,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 70 + Math.sin(this.menuRot * 1.4) * 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    ctx.lineCap = "round";
    for (const p of this.particles) {
      if (!p.active) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      const a = t * t;
      if (p.kind === 0) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.6, p.size * t);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      } else if (p.kind === 1) {
        const r = p.size * (0.8 + (1 - t) * 1.4) * 2.6;
        this.drawGlow(p.x, p.y, r, p.color, a * 0.8);
      } else {
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.7);
        ctx.lineTo(p.size, -p.size * 0.35);
        ctx.lineTo(p.size * 0.6, p.size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawShockwaves(): void {
    const ctx = this.ctx;
    for (const s of this.wavesFx) {
      if (!s.active) continue;
      const t = clamp(s.life / s.maxLife, 0, 1);
      ctx.globalAlpha = t * 0.85;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * t;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawBullets(): void {
    const ctx = this.ctx;
    for (const b of this.bullets) {
      if (!b.active || b.hostile) continue;
      const a = Math.atan2(b.vy, b.vx);
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.r * 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(a) * 13, b.y - Math.sin(a) * 13);
      ctx.lineTo(b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 6);
      ctx.stroke();
      this.drawGlow(b.x, b.y, b.r * 4, b.color, 0.55);
    }
    ctx.globalAlpha = 1;
  }

  private drawEnemyBullets(): void {
    const ctx = this.ctx;
    for (const b of this.bullets) {
      if (!b.active || !b.hostile) continue;
      const pulse = 0.75 + 0.25 * Math.sin(this.runTime * 18 + b.x);
      this.drawGlow(b.x, b.y, b.r * 4.2 * pulse, b.color, 0.6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.white;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawEnemies(): void {
    const ctx = this.ctx;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const st = ENEMY_STATS[e.kind];
      const flash = e.hitFlash;
      const body = flash > 0.05 ? PALETTE.white : st.color;
      const scale = e.spawnGrace > 0 ? 1 - e.spawnGrace * 0.9 : 1;

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.scale(scale, scale);
      this.drawGlow(0, 0, e.r * 3.1, st.color, 0.32 + flash * 0.5);

      ctx.rotate(e.angle);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = body;
      ctx.fillStyle = rgba(st.color, 0.22 + flash * 0.5);

      if (e.kind === "grunt") {
        poly(ctx, 4, e.r, 0);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = rgba(st.accent, 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.26, 0, TAU);
        ctx.fill();
      } else if (e.kind === "shooter") {
        poly(ctx, 6, e.r, 0);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-e.angle * 2);
        ctx.strokeStyle = rgba(st.accent, 0.8);
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.55, 0, TAU);
        ctx.stroke();
      } else if (e.kind === "dasher") {
        const a = e.charging > 0 ? Math.atan2(e.vy, e.vx) : Math.atan2(this.player.y - e.y, this.player.x - e.x);
        ctx.rotate(a - e.angle);
        poly(ctx, 3, e.r * 1.25, 0);
        ctx.fill();
        ctx.stroke();
        if (e.charging > 0) {
          ctx.strokeStyle = rgba(PALETTE.lime, 0.5);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-e.r * 2.4, 0);
          ctx.lineTo(-e.r * 1.1, 0);
          ctx.stroke();
        }
      } else {
        poly(ctx, 10, e.r, e.angle * 0.4);
        ctx.fill();
        ctx.stroke();
        ctx.rotate(e.angle * 1.6);
        ctx.strokeStyle = rgba(st.accent, 0.85);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.6, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.32, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();

      if (e.elite) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(this.menuRot * 2);
        ctx.strokeStyle = rgba(PALETTE.white, 0.55);
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (e.r + 5), Math.sin(a) * (e.r + 5));
          ctx.lineTo(Math.cos(a) * (e.r + 11), Math.sin(a) * (e.r + 11));
          ctx.stroke();
        }
        ctx.restore();
      }

      if (e.hp < e.maxHp) {
        const w = e.r * 2;
        const pct = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w, 3);
        ctx.fillStyle = st.accent;
        ctx.fillRect(e.x - w / 2, e.y - e.r - 11, w * pct, 3);
      }
    }
  }

  private drawPowerups(): void {
    const ctx = this.ctx;
    for (const pu of this.powerups) {
      if (!pu.active) continue;
      const color =
        pu.kind === "triple" ? PALETTE.magenta : pu.kind === "shield" ? PALETTE.cyan : PALETTE.amber;
      const blink = pu.life < 3 ? 0.35 + 0.65 * Math.abs(Math.sin(pu.life * 9)) : 1;
      ctx.save();
      ctx.translate(pu.x, pu.y);
      ctx.globalAlpha = blink;
      this.drawGlow(0, 0, pu.r * 3.4, color, 0.4);
      ctx.rotate(pu.rot);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.fillStyle = rgba(color, 0.2);
      poly(ctx, 4, pu.r, 0);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(-pu.rot * 2);
      ctx.strokeStyle = PALETTE.white;
      ctx.lineWidth = 2;
      if (pu.kind === "triple") {
        for (const off of [-0.35, 0, 0.35]) {
          ctx.beginPath();
          ctx.moveTo(-pu.r * 0.5, Math.sin(off) * pu.r * 0.7);
          ctx.lineTo(pu.r * 0.5, Math.sin(off) * pu.r * 0.7);
          ctx.stroke();
        }
      } else if (pu.kind === "shield") {
        ctx.beginPath();
        ctx.moveTo(0, -pu.r * 0.6);
        ctx.lineTo(0, pu.r * 0.6);
        ctx.moveTo(-pu.r * 0.55, 0);
        ctx.lineTo(pu.r * 0.55, 0);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-pu.r * 0.25, -pu.r * 0.65);
        ctx.lineTo(pu.r * 0.3, -pu.r * 0.1);
        ctx.lineTo(-pu.r * 0.05, -pu.r * 0.05);
        ctx.lineTo(pu.r * 0.25, pu.r * 0.7);
        ctx.lineTo(-pu.r * 0.35, pu.r * 0.02);
        ctx.lineTo(pu.r * 0.05, -pu.r * 0.02);
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;
    const blink = p.inv > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(p.inv * 22)) : 1;

    ctx.save();
    ctx.globalAlpha = blink;
    this.drawGlow(p.x, p.y, p.r * 4.4, PALETTE.cyan, 0.4);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.aim);

    // engine flame — sprite stretched with 'lighter' (no per-frame gradients)
    const flame = 10 + p.thrust * 18 + Math.random() * 6;
    ctx.globalCompositeOperation = "lighter";
    const flameSprite = this.glowSprite(PALETTE.ice);
    ctx.globalAlpha = 0.55 + p.thrust * 0.35;
    ctx.drawImage(
      flameSprite,
      -p.r - flame,
      -p.r * 0.75,
      flame + p.r * 0.8,
      p.r * 1.5,
    );
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(PALETTE.ice, 0.85);
    ctx.beginPath();
    ctx.moveTo(-p.r * 0.8, -p.r * 0.42);
    ctx.lineTo(-p.r - flame * 0.55, 0);
    ctx.lineTo(-p.r * 0.8, p.r * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    // hull
    ctx.fillStyle = rgba("#0a2b3a", 0.95);
    ctx.strokeStyle = PALETTE.cyan;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(p.r * 1.5, 0);
    ctx.lineTo(-p.r * 0.9, -p.r * 0.95);
    ctx.lineTo(-p.r * 0.45, 0);
    ctx.lineTo(-p.r * 0.9, p.r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = PALETTE.ice;
    ctx.beginPath();
    ctx.arc(p.r * 0.25, 0, p.r * 0.28, 0, TAU);
    ctx.fill();

    if (p.triple > 0) {
      ctx.strokeStyle = rgba(PALETTE.magenta, 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 1.7, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();

    // invulnerability shield ring
    if (p.inv > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(PALETTE.cyan, 0.35 + 0.3 * Math.sin(p.inv * 16));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 2.1, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // pulse-ready halo
    if (this.pulseCd >= this.pulseMax) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = "lighter";
      const pr = p.r * 2.9 + Math.sin(this.runTime * 6) * 2.5;
      ctx.strokeStyle = rgba(PALETTE.amber, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawTexts(): void {
    const ctx = this.ctx;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const t of this.texts) {
      if (!t.active) continue;
      const k = clamp(t.life / t.maxLife, 0, 1);
      ctx.globalAlpha = k;
      ctx.font = `800 ${t.size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawVignette(): void {
    const ctx = this.ctx;
    if (this.vignette) {
      ctx.fillStyle = this.vignette;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // damage border flash (cheap chromatic "hit" feedback)
    if (this.chroma > 0.01) {
      const a = this.chroma * 0.22;
      const t = 12;
      ctx.fillStyle = `rgba(255,45,90,${a})`;
      ctx.fillRect(0, 0, this.w, t);
      ctx.fillRect(0, this.h - t, this.w, t);
      ctx.fillRect(0, 0, t, this.h);
      ctx.fillRect(this.w - t, 0, t, this.h);
    }
  }

  private mono(size: number, weight = 800): void {
    this.ctx.font = `${weight} ${size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  }

  private drawHud(): void {
    const ctx = this.ctx;
    const p = this.player;
    const pad = 18;

    // score
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.globalAlpha = 0.75;
    this.mono(12, 700);
    ctx.fillStyle = PALETTE.cyan;
    ctx.fillText("SCORE", pad + 2, pad + 14);
    ctx.globalAlpha = 1;
    this.mono(34);
    ctx.fillStyle = PALETTE.white;
    ctx.fillText(String(Math.floor(this.score)).padStart(5, "0"), pad, pad + 50);

    this.mono(12, 700);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#8fd6ff";
    ctx.fillText(
      `BEST ${Math.max(0, this.bestShown)}  ·  WAVE ${this.wave}  ·  ${this.kills} KILLS`,
      pad + 2,
      pad + 70,
    );
    ctx.globalAlpha = 1;

    // hull pips
    const pipY = this.h - 34;
    for (let i = 0; i < p.maxHp; i++) {
      const x = pad + 6 + i * 26;
      const on = i < p.hp;
      ctx.save();
      ctx.translate(x, pipY);
      ctx.rotate(Math.PI / 2);
      if (on) {
        ctx.fillStyle = PALETTE.cyan;
        ctx.strokeStyle = PALETTE.ice;
      } else {
        ctx.fillStyle = "rgba(62,233,255,0.12)";
        ctx.strokeStyle = "rgba(62,233,255,0.3)";
      }
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // combo (top center)
    if (this.combo >= 2) {
      const mult = this.multiplier();
      ctx.textAlign = "center";
      this.mono(26);
      ctx.fillStyle = mult >= 4 ? PALETTE.amber : PALETTE.ice;
      ctx.fillText(`x${mult}`, this.w / 2, 46);
      this.mono(11, 700);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = PALETTE.amber;
      ctx.fillText(`${this.combo} CHAIN`, this.w / 2, 64);
      ctx.globalAlpha = 1;
      const barW = 120;
      const pct = clamp(this.comboTimer / 2.6, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(this.w / 2 - barW / 2, 72, barW, 3);
      ctx.fillStyle = PALETTE.amber;
      ctx.fillRect(this.w / 2 - barW / 2, 72, barW * pct, 3);
    }

    // triple shot timer
    if (p.triple > 0) {
      ctx.textAlign = "left";
      this.mono(12, 700);
      ctx.fillStyle = PALETTE.magenta;
      ctx.fillText(`TRI-SHOT ${p.triple.toFixed(1)}s`, pad + 2, this.h - 62);
    }

    // pulse gauge (bottom center)
    const gx = this.w / 2;
    const gy = this.h - 46;
    const ready = this.pulseCd >= this.pulseMax;
    const pct = clamp(this.pulseCd / this.pulseMax, 0, 1);
    ctx.save();
    ctx.translate(gx, gy);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 19, -Math.PI * 0.85, Math.PI * 0.85);
    ctx.stroke();
    ctx.strokeStyle = ready ? PALETTE.amber : PALETTE.cyan;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, 19, -Math.PI * 0.85, -Math.PI * 0.85 + Math.PI * 1.7 * pct);
    ctx.stroke();
    ctx.lineCap = "butt";
    if (ready) {
      ctx.globalCompositeOperation = "lighter";
      this.drawGlow(0, 0, 34, PALETTE.amber, 0.35 + 0.2 * Math.sin(this.runTime * 8));
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.textAlign = "center";
    this.mono(9, 800);
    ctx.fillStyle = ready ? PALETTE.amber : "rgba(180,220,255,0.7)";
    ctx.fillText(ready ? "READY" : "PULSE", 0, 34);
    ctx.restore();

    // hint
    if (this.hintTimer > 0) {
      const a = clamp(this.hintTimer, 0, 1);
      ctx.globalAlpha = a * 0.85;
      ctx.textAlign = "center";
      this.mono(13, 700);
      ctx.fillStyle = "#bfe9ff";
      const msg = this.touchUsed
        ? "DRAG TO MOVE  ·  TAP ⚡ FOR PULSE  ·  GUNS ARE AUTOMATIC"
        : "WASD / ARROWS TO MOVE  ·  SPACE = PULSE  ·  GUNS ARE AUTOMATIC";
      ctx.fillText(msg, this.w / 2, this.h * 0.2);
      ctx.globalAlpha = 1;
    }

    // wave announcement
    if (this.announceLife > 0) {
      const k = clamp(this.announceLife, 0, 1);
      const pop = 1 + (1 - clamp(this.announceLife / 2.2, 0, 1)) * 0.0;
      ctx.save();
      ctx.translate(this.w / 2, this.h * 0.36);
      ctx.scale(pop, pop);
      ctx.globalAlpha = k;
      ctx.textAlign = "center";
      this.mono(46);
      ctx.fillStyle = PALETTE.ice;
      ctx.fillText(this.announceText, 0, 0);
      this.mono(14, 700);
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillText(this.announceSub, 0, 30);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  private bestShown = 0;

  private drawTouchControls(): void {
    const ctx = this.ctx;
    // virtual joystick
    if (this.pointer.active) {
      const { ox, oy, x, y } = this.pointer;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox, oy, 56, 0, TAU);
      ctx.stroke();
      const dx = x - ox;
      const dy = y - oy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 56);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = rgba(PALETTE.cyan, 0.35);
      ctx.beginPath();
      ctx.arc(ox + (dx / d) * 56 * k, oy + (dy / d) * 56 * k, 22, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // pulse button
    const b = this.pulseBtn();
    const ready = this.pulseCd >= this.pulseMax;
    const pct = clamp(this.pulseCd / this.pulseMax, 0, 1);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.globalAlpha = this.touchUsed ? 0.9 : 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = ready ? PALETTE.amber : rgba(PALETTE.cyan, 0.7);
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, b.r, -Math.PI / 2, -Math.PI / 2 + TAU * pct);
    ctx.stroke();
    ctx.lineCap = "butt";
    if (ready) {
      ctx.globalCompositeOperation = "lighter";
      this.drawGlow(0, 0, b.r * 1.5, PALETTE.amber, 0.4);
      ctx.globalCompositeOperation = "source-over";
    }
    // lightning glyph
    ctx.strokeStyle = ready ? PALETTE.amber : rgba(PALETTE.cyan, 0.8);
    ctx.lineWidth = 3.4;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-7, -14);
    ctx.lineTo(6, -3);
    ctx.lineTo(-1, -1);
    ctx.lineTo(6, 15);
    ctx.lineTo(-7, 2);
    ctx.lineTo(1, -1);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  setBestShown(v: number): void {
    this.bestShown = v;
  }
}

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

function poly(ctx: CanvasRenderingContext2D, sides: number, r: number, rot: number): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

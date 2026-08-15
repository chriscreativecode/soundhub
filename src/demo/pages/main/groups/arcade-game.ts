/**
 * Audio Invaders: a 320x200 shooter in the spirit of an early DOS game, used
 * here as a load test for sound groups. Firing fast is meant to overrun the
 * weapons group so you can hear and see the oldest shot being cut off.
 */

import { drawText, textWidth } from './bitmap-font';

export type GameState = 'attract' | 'playing' | 'paused' | 'over';

export interface GroupUsage {
  label: string;
  used: number;
  max: number;
  color: string;
}

export interface ArcadeHooks {
  play(soundId: string): void;
  stopCombatGroups(): void;
  usage(): GroupUsage[];
  onState?(state: GameState): void;
  onScore?(score: number, wave: number, lives: number): void;
}

const W = 320;
const H = 200;

const COLOR = {
  black: '#000000',
  navy: '#000e2b',
  blue: '#0000aa',
  cyan: '#00aaaa',
  red: '#aa0000',
  gray: '#aaaaaa',
  dgray: '#555555',
  lblue: '#5555ff',
  lgreen: '#55ff55',
  lcyan: '#55ffff',
  lred: '#ff5555',
  lmagenta: '#ff55ff',
  yellow: '#ffff55',
  white: '#ffffff',
};

const SHIP = [
  '.....X.....',
  '....XXX....',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  'XX.XXXXX.XX',
];

const INVADER = [
  ['..X..X..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', 'X......X'],
  ['..X..X..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '.X.XX.X.', '.X....X.'],
];

/**
 * Shape of one bunker, one character per 2x2 block. The arch in the bottom
 * middle is what lets you shoot out from underneath it.
 */
const BUNKER = [
  '..XXXXXXXX..',
  '.XXXXXXXXXX.',
  'XXXXXXXXXXXX',
  'XXXXXXXXXXXX',
  'XXXX....XXXX',
  'XXX......XXX',
];

const BUNKER_CELL = 2;
const BUNKER_COLS = BUNKER[0].length;
const BUNKER_ROWS = BUNKER.length;
const BUNKER_COUNT = 4;
const BUNKER_Y = 150;

const ROW_COLORS = [COLOR.lmagenta, COLOR.lcyan, COLOR.lgreen, COLOR.yellow];
const ROW_SCORE = [40, 30, 20, 10];

const COLS = 8;
const ROWS = 3;
const COL_STEP = 26;
const ROW_STEP = 15;
const GRID_LEFT = 32;
const GRID_TOP = 36;
const INVADER_W = 8;
const INVADER_H = 6;
const SHIP_W = 11;
const SHIP_H = 6;
const SHIP_Y = 176;
const FLOOR_Y = 172;

interface Invader {
  col: number;
  row: number;
  x: number;
  y: number;
  alive: boolean;
}

interface Shot {
  x: number;
  y: number;
}

/** A bunker is a grid of small blocks that get shot away one cluster at a time. */
interface Bunker {
  x: number;
  cells: boolean[][];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class ArcadeGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly hooks: ArcadeHooks;

  private state: GameState = 'attract';
  private raf = 0;
  private lastFrame = 0;
  private clock = 0;
  private ready = false;

  private keys = new Set<string>();
  private virtual = { left: false, right: false, fire: false };

  private shipX = W / 2 - SHIP_W / 2;
  private invaders: Invader[] = [];
  private shots: Shot[] = [];
  private bombs: Shot[] = [];
  private bunkers: Bunker[] = [];
  private particles: Particle[] = [];
  private stars: { x: number; y: number; speed: number }[] = [];

  private score = 0;
  private wave = 1;
  private lives = 3;
  private fireCooldown = 0;
  private stepTimer = 0;
  private bombTimer = 1.4;
  private direction = 1;
  private frameToggle = 0;
  private invulnerable = 0;
  private alarmed = false;

  constructor(canvas: HTMLCanvasElement, hooks: ArcadeHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.canvas.width = W;
    this.canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < 26; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: 24 + Math.random() * (FLOOR_Y - 30),
        speed: 3 + Math.random() * 9,
      });
    }

    this.buildWave();
    this.bindInput();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setReady(ready: boolean): void {
    this.ready = ready;
  }

  startOrResume(): void {
    if (!this.ready) return;
    this.canvas.focus();
    if (this.state === 'attract' || this.state === 'over') {
      this.reset();
      this.setState('playing');
      this.hooks.play('sfx-blip');
    } else if (this.state === 'paused') {
      this.setState('playing');
    }
  }

  togglePause(): void {
    if (this.state === 'playing') this.setState('paused');
    else if (this.state === 'paused') this.setState('playing');
  }

  setVirtualKey(key: 'left' | 'right' | 'fire', down: boolean): void {
    this.virtual[key] = down;
    if (key === 'fire' && down && this.state !== 'playing') this.startOrResume();
  }

  getState(): GameState {
    return this.state;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private bindInput(): void {
    this.canvas.tabIndex = 0;
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('blur', this.onBlur);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  // Keys are only captured while the screen has focus, so arrows and space keep
  // scrolling the page everywhere else.
  private onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'spacebar'].includes(key)) {
      event.preventDefault();
    }
    if (key === 'enter' || key === ' ' || key === 'spacebar') {
      if (this.state !== 'playing') {
        this.startOrResume();
        return;
      }
    }
    if (key === 'p') this.togglePause();
    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onBlur = (): void => {
    this.keys.clear();
    if (this.state === 'playing') this.setState('paused');
  };

  private onPointerDown = (): void => {
    this.canvas.focus();
    if (this.state !== 'playing') this.startOrResume();
  };

  private held(...names: string[]): boolean {
    return names.some(name => this.keys.has(name));
  }

  // ── Game state ─────────────────────────────────────────────────────────────

  private setState(state: GameState): void {
    this.state = state;
    this.hooks.onState?.(state);
  }

  private reset(): void {
    this.score = 0;
    this.wave = 1;
    this.lives = 3;
    this.shots = [];
    this.bombs = [];
    this.particles = [];
    this.shipX = W / 2 - SHIP_W / 2;
    this.invulnerable = 0;
    this.buildWave();
    this.reportHud();
  }

  /** Fresh bunkers every wave, so a cleared screen is a clean restart. */
  private buildBunkers(): void {
    const width = BUNKER_COLS * BUNKER_CELL;
    const gap = (W - BUNKER_COUNT * width) / (BUNKER_COUNT + 1);

    this.bunkers = [];
    for (let i = 0; i < BUNKER_COUNT; i++) {
      this.bunkers.push({
        x: Math.round(gap + i * (width + gap)),
        cells: BUNKER.map(row => [...row].map(char => char !== '.')),
      });
    }
  }

  private buildWave(): void {
    this.invaders = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.invaders.push({
          col,
          row,
          x: GRID_LEFT + col * COL_STEP,
          y: GRID_TOP + row * ROW_STEP + Math.min(24, (this.wave - 1) * 6),
          alive: true,
        });
      }
    }
    this.direction = 1;
    this.stepTimer = 0;
    this.bombTimer = 1.2;
    this.alarmed = false;
    this.buildBunkers();
  }

  private reportHud(): void {
    this.hooks.onScore?.(this.score, this.wave, this.lives);
  }

  // ── Loop ───────────────────────────────────────────────────────────────────

  private frame = (time: number): void => {
    const delta = this.lastFrame ? Math.min(0.05, (time - this.lastFrame) / 1000) : 0;
    this.lastFrame = time;
    this.clock += delta;

    if (this.state === 'playing') this.update(delta);
    else this.updateStars(delta * 0.4);

    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private updateStars(delta: number): void {
    for (const star of this.stars) {
      star.y += star.speed * delta;
      if (star.y > FLOOR_Y) {
        star.y = 24;
        star.x = Math.random() * W;
      }
    }
  }

  private update(delta: number): void {
    this.updateStars(delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);

    const left = this.virtual.left || this.held('arrowleft', 'a');
    const right = this.virtual.right || this.held('arrowright', 'd');
    if (left) this.shipX -= 96 * delta;
    if (right) this.shipX += 96 * delta;
    this.shipX = Math.max(8, Math.min(W - SHIP_W - 8, this.shipX));

    if ((this.virtual.fire || this.held(' ', 'spacebar', 'arrowup', 'w')) && this.fireCooldown === 0) {
      this.fire();
    }

    for (const shot of this.shots) shot.y -= 210 * delta;
    this.shots = this.shots.filter(shot => shot.y > 22);

    for (const bomb of this.bombs) bomb.y += 72 * delta;
    this.bombs = this.bombs.filter(bomb => bomb.y < H - 10);

    this.updateInvaders(delta);
    this.updateCollisions();

    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 60 * delta;
      particle.life -= delta;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
  }

  private fire(): void {
    this.fireCooldown = 0.16;
    this.shots.push({ x: this.shipX + SHIP_W / 2, y: SHIP_Y - 4 });
    this.hooks.play('sfx-laser');
  }

  private updateInvaders(delta: number): void {
    const alive = this.invaders.filter(invader => invader.alive);
    if (alive.length === 0) {
      this.wave++;
      this.buildWave();
      this.shots = [];
      this.bombs = [];
      this.hooks.play('sfx-wave');
      this.reportHud();
      return;
    }

    // The fewer are left, the faster the rest march. Classic, and it pushes the
    // player into firing fast enough to hit the group limit.
    const pace = 0.5 * (alive.length / (COLS * ROWS)) + 0.09 - Math.min(0.05, this.wave * 0.008);
    this.stepTimer -= delta;
    if (this.stepTimer <= 0) {
      this.stepTimer = Math.max(0.07, pace);
      this.frameToggle ^= 1;

      const hitEdge = alive.some(invader => {
        const next = invader.x + this.direction * 4;
        return next < 8 || next + INVADER_W > W - 8;
      });

      if (hitEdge) {
        this.direction *= -1;
        for (const invader of alive) invader.y += 7;
      } else {
        for (const invader of alive) invader.x += this.direction * 4;
      }
    }

    const lowest = Math.max(...alive.map(invader => invader.y));
    if (!this.alarmed && lowest > 118) {
      this.alarmed = true;
      this.hooks.play('sfx-alarm');
    }
    if (lowest + INVADER_H >= SHIP_Y) {
      this.lives = 0;
      this.gameOver();
      return;
    }

    this.bombTimer -= delta;
    if (this.bombTimer <= 0) {
      this.bombTimer = 0.5 + Math.random() * 1.3;
      const shooter = alive[Math.floor(Math.random() * alive.length)];
      this.bombs.push({ x: shooter.x + INVADER_W / 2, y: shooter.y + INVADER_H });
    }
  }

  /**
   * Punches a hole in whichever bunker covers this point.
   * Returns true when the shot or bomb was absorbed by one.
   */
  private hitBunker(x: number, y: number): boolean {
    for (const bunker of this.bunkers) {
      const col = Math.floor((x - bunker.x) / BUNKER_CELL);
      const row = Math.floor((y - BUNKER_Y) / BUNKER_CELL);
      if (col < 0 || col >= BUNKER_COLS || row < 0 || row >= BUNKER_ROWS) continue;
      // Inside the bunker's box but on a block that is already gone: it flies on
      if (!bunker.cells[row][col]) continue;

      // Take out a small cluster, so the bunker erodes instead of pinholing
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r < 0 || r >= BUNKER_ROWS || c < 0 || c >= BUNKER_COLS) continue;
          bunker.cells[r][c] = false;
        }
      }

      this.burst(x, y, COLOR.gray, 6);
      this.hooks.play('sfx-shield');
      return true;
    }
    return false;
  }

  /** Invaders marching over a bunker scrape it away, silently. */
  private crushBunkers(): void {
    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      if (invader.y + INVADER_H < BUNKER_Y) continue;

      for (const bunker of this.bunkers) {
        for (let row = 0; row < BUNKER_ROWS; row++) {
          const cellY = BUNKER_Y + row * BUNKER_CELL;
          if (cellY + BUNKER_CELL <= invader.y || cellY >= invader.y + INVADER_H) continue;
          for (let col = 0; col < BUNKER_COLS; col++) {
            const cellX = bunker.x + col * BUNKER_CELL;
            if (cellX + BUNKER_CELL <= invader.x || cellX >= invader.x + INVADER_W) continue;
            bunker.cells[row][col] = false;
          }
        }
      }
    }
  }

  private updateCollisions(): void {
    for (let s = this.shots.length - 1; s >= 0; s--) {
      if (this.hitBunker(this.shots[s].x, this.shots[s].y)) {
        this.shots.splice(s, 1);
      }
    }

    for (let b = this.bombs.length - 1; b >= 0; b--) {
      if (this.hitBunker(this.bombs[b].x, this.bombs[b].y)) {
        this.bombs.splice(b, 1);
      }
    }

    this.crushBunkers();

    for (let s = this.shots.length - 1; s >= 0; s--) {
      const shot = this.shots[s];
      for (const invader of this.invaders) {
        if (!invader.alive) continue;
        if (
          shot.x >= invader.x && shot.x <= invader.x + INVADER_W &&
          shot.y >= invader.y && shot.y <= invader.y + INVADER_H
        ) {
          invader.alive = false;
          this.shots.splice(s, 1);
          this.score += ROW_SCORE[invader.row] ?? 10;
          this.burst(invader.x + INVADER_W / 2, invader.y + INVADER_H / 2, ROW_COLORS[invader.row] ?? COLOR.yellow, 10);
          this.hooks.play('sfx-boom');
          this.reportHud();
          break;
        }
      }
    }

    if (this.invulnerable > 0) return;

    for (let b = this.bombs.length - 1; b >= 0; b--) {
      const bomb = this.bombs[b];
      if (
        bomb.x >= this.shipX && bomb.x <= this.shipX + SHIP_W &&
        bomb.y >= SHIP_Y && bomb.y <= SHIP_Y + SHIP_H
      ) {
        this.bombs.splice(b, 1);
        this.lives--;
        this.invulnerable = 1.8;
        this.burst(this.shipX + SHIP_W / 2, SHIP_Y + 2, COLOR.lred, 16);
        this.hooks.play('sfx-hit');
        this.reportHud();
        if (this.lives <= 0) this.gameOver();
        return;
      }
    }
  }

  private gameOver(): void {
    this.setState('over');
    this.hooks.play('sfx-over');
    this.hooks.stopCombatGroups();
    this.reportHud();
  }

  private burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 20 + Math.random() * 45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        color: i % 3 === 0 ? COLOR.white : color,
      });
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private draw(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR.black;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = COLOR.navy;
    ctx.fillRect(0, 22, W, FLOOR_Y - 22);

    for (const star of this.stars) {
      ctx.fillStyle = star.speed > 8 ? COLOR.gray : COLOR.dgray;
      ctx.fillRect(Math.round(star.x), Math.round(star.y), 1, 1);
    }

    this.drawHud();

    for (const invader of this.invaders) {
      if (!invader.alive) continue;
      this.sprite(INVADER[this.frameToggle], invader.x, invader.y, ROW_COLORS[invader.row] ?? COLOR.lgreen);
    }

    this.drawBunkers();

    ctx.fillStyle = COLOR.yellow;
    for (const shot of this.shots) ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 1, 4);

    ctx.fillStyle = COLOR.lred;
    for (const bomb of this.bombs) ctx.fillRect(Math.round(bomb.x), Math.round(bomb.y), 1, 3);

    const blink = this.invulnerable > 0 && Math.floor(this.clock * 12) % 2 === 0;
    if (this.state !== 'over' && !blink) {
      this.sprite(SHIP, this.shipX, SHIP_Y, COLOR.lcyan);
    }

    for (const particle of this.particles) {
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 1, 1);
    }

    ctx.fillStyle = COLOR.dgray;
    ctx.fillRect(0, FLOOR_Y + 12, W, 1);
    this.drawGroupBar();

    // Anything but a running game gets the playfield dimmed, so the text on top
    // of it stays readable against the invaders.
    if (this.state !== 'playing' || !this.ready) {
      ctx.fillStyle = 'rgba(0, 4, 16, 0.78)';
      ctx.fillRect(0, 22, W, FLOOR_Y - 22);
    }

    if (this.state === 'attract') this.drawAttract();
    if (this.state === 'paused') this.drawPanel('PAUSED', 'PRESS P OR CLICK TO RESUME');
    if (this.state === 'over') this.drawPanel('GAME OVER', `SCORE ${this.pad(this.score, 5)} - PRESS ENTER`);
    if (!this.ready) this.drawPanel('LOADING', 'SYNTHESISING SOUND EFFECTS');
  }

  private drawBunkers(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR.lgreen;
    for (const bunker of this.bunkers) {
      for (let row = 0; row < BUNKER_ROWS; row++) {
        for (let col = 0; col < BUNKER_COLS; col++) {
          if (!bunker.cells[row][col]) continue;
          ctx.fillRect(
            bunker.x + col * BUNKER_CELL,
            BUNKER_Y + row * BUNKER_CELL,
            BUNKER_CELL,
            BUNKER_CELL,
          );
        }
      }
    }
  }

  private drawHud(): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR.blue;
    ctx.fillRect(0, 0, W, 20);
    ctx.fillStyle = COLOR.dgray;
    ctx.fillRect(0, 20, W, 1);

    this.text(`SCORE ${this.pad(this.score, 5)}`, 6, 7, COLOR.white);
    this.text(`WAVE ${this.pad(this.wave, 2)}`, 132, 7, COLOR.yellow);

    this.text('SHIPS', 232, 7, COLOR.white);
    for (let i = 0; i < Math.max(0, this.lives); i++) {
      this.sprite(SHIP, 268 + i * 14, 6, COLOR.lcyan);
    }
  }

  /** The same voice slots the panels next to the screen show, drawn in-game. */
  private drawGroupBar(): void {
    const usage = this.hooks.usage();
    let x = 6;
    for (const group of usage) {
      this.text(group.label.toUpperCase(), x, H - 12, COLOR.gray);
      x += textWidth(group.label) + 6;
      for (let slot = 0; slot < group.max; slot++) {
        this.ctx.fillStyle = slot < group.used ? group.color : COLOR.dgray;
        this.ctx.fillRect(x, H - 12, 4, 7);
        x += 6;
      }
      x += 8;
    }
  }

  private drawAttract(): void {
    this.text('AUDIO INVADERS', W / 2, 48, COLOR.lgreen, 'center', 2);

    this.text('EVERY SHOT IS ITS OWN SOUND INSTANCE', W / 2, 78, COLOR.lcyan, 'center');
    this.text('FILL THE WEAPONS GROUP AND THE OLDEST STOPS', W / 2, 90, COLOR.gray, 'center');

    this.text('ARROWS OR A/D   MOVE', W / 2, 112, COLOR.white, 'center');
    this.text('SPACE FIRE      P PAUSE', W / 2, 124, COLOR.white, 'center');

    if (Math.floor(this.clock * 2) % 2 === 0) {
      this.text('CLICK THE SCREEN, THEN PRESS ENTER', W / 2, 146, COLOR.yellow, 'center');
    }
  }

  private drawPanel(title: string, subtitle: string): void {
    const ctx = this.ctx;
    // Drawn with fills instead of a stroke, so the frame lands on whole pixels
    ctx.fillStyle = COLOR.lcyan;
    ctx.fillRect(36, 76, W - 72, 48);
    ctx.fillStyle = COLOR.black;
    ctx.fillRect(37, 77, W - 74, 46);
    this.text(title, W / 2, 86, COLOR.white, 'center', 2);
    if (Math.floor(this.clock * 2) % 2 === 0) {
      this.text(subtitle, W / 2, 106, COLOR.yellow, 'center');
    }
  }

  // ── Primitives ─────────────────────────────────────────────────────────────

  private sprite(rows: string[], x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const left = Math.round(x);
    const top = Math.round(y);
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        if (rows[row][col] !== '.') ctx.fillRect(left + col, top + row, 1, 1);
      }
    }
  }

  private text(
    value: string,
    x: number,
    y: number,
    color: string,
    align: 'left' | 'center' | 'right' = 'left',
    scale = 1,
  ): void {
    let left = x;
    if (align === 'center') left = x - textWidth(value, scale) / 2;
    else if (align === 'right') left = x - textWidth(value, scale);
    drawText(this.ctx, value, left, y, color, scale);
  }

  private pad(value: number, size: number): string {
    return String(Math.max(0, value)).padStart(size, '0');
  }
}

export type Move = 1 | 2 | 3; // 1 = Rock, 2 = Paper, 3 = Scissors

export type RoundOutcome = 0 | 1 | 2; // 0 = Tie, 1 = Player wins round, 2 = Bot wins round

export type GameScreen = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export type DuelPhase =
  | 'awaiting_move'
  | 'countdown'
  | 'reveal'
  | 'trigger_aim'
  | 'trigger_cock'
  | 'trigger_result'
  | 'finished';

export type CameraPreset = 'duel' | 'cylinder' | 'overhead';

export class Gun {
  private readonly bulletSlot: number;
  private currentSlot: number;

  constructor() {
    this.bulletSlot = Math.floor(Math.random() * 6);
    this.currentSlot = 0;
  }

  pullTrigger(): boolean {
    const fired = this.currentSlot === this.bulletSlot;
    this.currentSlot = Math.min(this.currentSlot + 1, 6);
    return fired;
  }

  getCurrentSlot(): number {
    return this.currentSlot;
  }

  getBulletSlot(): number {
    return this.bulletSlot;
  }

  getRemainingChambers(): number {
    return Math.max(0, 6 - this.currentSlot);
  }

  getShotProbability(): number {
    const remaining = this.getRemainingChambers();
    if (remaining <= 0) return 100;
    return Math.round((1 / remaining) * 1000) / 10;
  }
}

export class Player {
  private name: string;
  private alive: boolean;

  constructor(name = 'Player') {
    this.name = name;
    this.alive = true;
  }

  setName(n: string): void {
    this.name = n;
  }

  getName(): string {
    return this.name;
  }

  isAlive(): boolean {
    return this.alive;
  }

  die(): void {
    this.alive = false;
  }
}

export class Bot extends Player {
  constructor() {
    super('Bot');
  }

  chooseMove(): Move {
    return (Math.floor(Math.random() * 3) + 1) as Move;
  }
}

export function moveName(m: Move): string {
  if (m === 1) return 'Rock';
  if (m === 2) return 'Paper';
  return 'Scissors';
}

export function winner(a: Move, b: Move): RoundOutcome {
  if (a === b) return 0;
  if ((a === 1 && b === 3) || (a === 2 && b === 1) || (a === 3 && b === 2)) {
    return 1;
  }
  return 2;
}

export interface HudSnapshot {
  screen: GameScreen;
  phase: DuelPhase;
  round: number;
  playerAlive: boolean;
  botAlive: boolean;
  currentSlot: number;
  bulletSlot: number;
  remainingChambers: number;
  shotProbability: number;
  playerMove: Move | null;
  botMove: Move | null;
  lastOutcome: RoundOutcome | null;
  lastLoser: 'player' | 'bot' | null;
  lastFired: boolean | null;
  headline: string;
  subline: string;
  clicksSurvived: number;
  tiesCount: number;
  cameraPreset: CameraPreset;
}

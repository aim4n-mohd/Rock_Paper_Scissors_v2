import type { Faction } from '../config/factions';
import type { Vector } from '../math/vector';

export const TUTORIAL_STAGES = [
  'move',
  'recruit',
  'prey',
  'predator',
  'dash',
  'shrine',
  'switch',
  'complete',
] as const;
export type TutorialStage = (typeof TUTORIAL_STAGES)[number];

export interface TutorialEntity {
  id: string;
  faction: Faction;
  position: Vector;
  role: 'player' | 'ally' | 'prey' | 'predator';
  visible: boolean;
}

export interface TutorialSnapshot {
  mapId: 'tutorial';
  stage: TutorialStage;
  playerFaction: Faction;
  entities: readonly TutorialEntity[];
  shrine: Vector;
}

const POSITIONS: readonly TutorialEntity[] = [
  {
    id: 'tutorial-player',
    faction: 'rock',
    position: { x: 120, y: 230 },
    role: 'player',
    visible: true,
  },
  {
    id: 'tutorial-ally',
    faction: 'rock',
    position: { x: 250, y: 230 },
    role: 'ally',
    visible: true,
  },
  {
    id: 'tutorial-prey',
    faction: 'scissors',
    position: { x: 405, y: 170 },
    role: 'prey',
    visible: true,
  },
  {
    id: 'tutorial-predator',
    faction: 'paper',
    position: { x: 500, y: 320 },
    role: 'predator',
    visible: false,
  },
];

export class TutorialController {
  private stageIndex = 0;
  private playerFaction: Faction = 'rock';
  private playerPosition = { ...POSITIONS[0]!.position };
  private predatorPosition = { ...POSITIONS[3]!.position };
  private distanceMoved = 0;
  private lastDirection: Vector = { x: 1, y: 0 };

  snapshot(): TutorialSnapshot {
    const stage = TUTORIAL_STAGES[this.stageIndex]!;
    return {
      mapId: 'tutorial',
      stage,
      playerFaction: this.playerFaction,
      entities: POSITIONS.map((entity) => ({
        ...entity,
        position:
          entity.role === 'player'
            ? { ...this.playerPosition }
            : entity.role === 'predator'
              ? { ...this.predatorPosition }
              : { ...entity.position },
        visible:
          entity.role !== 'predator' ||
          TUTORIAL_STAGES.indexOf(stage) >= TUTORIAL_STAGES.indexOf('predator'),
      })),
      shrine: { x: 680, y: 225 },
    };
  }

  update(deltaMs: number, input: Vector): void {
    const length = Math.hypot(input.x, input.y);
    if (length === 0) return;
    const stage = this.snapshot().stage;
    if (stage === 'switch' || stage === 'complete') return;
    const direction = { x: input.x / length, y: input.y / length };
    this.lastDirection = direction;
    const moved = Math.min(deltaMs, 250) * 0.16;
    this.playerPosition.x = Math.max(
      24,
      Math.min(776, this.playerPosition.x + direction.x * moved),
    );
    this.playerPosition.y = Math.max(
      24,
      Math.min(426, this.playerPosition.y + direction.y * moved),
    );

    if (stage === 'move') {
      this.distanceMoved += moved;
      if (this.distanceMoved >= 40) this.advance();
      return;
    }
    if (stage === 'recruit' && this.distanceTo(POSITIONS[1]!.position) <= 48) {
      this.advance();
      return;
    }
    if (stage === 'prey' && this.distanceTo(POSITIONS[2]!.position) <= 42) {
      this.advance();
      return;
    }
    if (stage === 'predator') {
      const predatorDistance = Math.hypot(
        this.playerPosition.x - this.predatorPosition.x,
        this.playerPosition.y - this.predatorPosition.y,
      );
      if (predatorDistance > 0) {
        const chaseDistance = Math.min(18, moved * 0.45);
        this.predatorPosition.x +=
          ((this.playerPosition.x - this.predatorPosition.x) / predatorDistance) * chaseDistance;
        this.predatorPosition.y +=
          ((this.playerPosition.y - this.predatorPosition.y) / predatorDistance) * chaseDistance;
      }
      if (
        Math.hypot(
          this.playerPosition.x - this.predatorPosition.x,
          this.playerPosition.y - this.predatorPosition.y,
        ) >= 215
      )
        this.advance();
      return;
    }
    if (stage === 'shrine' && this.distanceTo({ x: 680, y: 225 }) <= 58) this.advance();
  }

  requestDash(): void {
    if (this.snapshot().stage !== 'dash') return;
    this.playerPosition.x = Math.max(
      24,
      Math.min(776, this.playerPosition.x + this.lastDirection.x * 90),
    );
    this.playerPosition.y = Math.max(
      24,
      Math.min(426, this.playerPosition.y + this.lastDirection.y * 90),
    );
    this.advance();
  }

  selectFaction(faction: Faction): void {
    if (this.snapshot().stage !== 'switch' || faction === this.playerFaction) return;
    this.playerFaction = faction;
    this.advance();
  }

  private advance(): void {
    this.stageIndex = Math.min(TUTORIAL_STAGES.length - 1, this.stageIndex + 1);
  }

  private distanceTo(target: Vector): number {
    return Math.hypot(this.playerPosition.x - target.x, this.playerPosition.y - target.y);
  }
}

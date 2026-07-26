import { normalize, vec, type Vector } from '../math/vector';
import type { GameSnapshot } from '../simulation/Simulation';
import type { Faction } from '../config/factions';
import type { VisualSettings } from '../systems/gameFeel';

type SnapshotListener = (snapshot: GameSnapshot) => void;
interface GameController {
  setPaused?(paused: boolean): void;
  togglePause(): void;
  restart(): void;
  killFaction(faction: Faction): void;
  cycleShrineSelection(direction: -1 | 1): void;
  selectShrineFaction(faction: Faction): void;
  requestDash(): void;
  applyVisualSettings?(settings: Partial<VisualSettings>): void;
}

class GameBridge {
  private listeners = new Set<SnapshotListener>();
  private pressed = new Set<string>();
  private controllers: GameController[] = [];
  latest?: GameSnapshot;

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    if (this.latest) listener(this.latest);
    return () => this.listeners.delete(listener);
  }

  publish(snapshot: GameSnapshot): void {
    this.latest = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  bindController(controller: GameController): () => void {
    this.controllers.push(controller);
    return () => {
      const index = this.controllers.lastIndexOf(controller);
      if (index >= 0) this.controllers.splice(index, 1);
    };
  }

  setKey(key: string, pressed: boolean): void {
    const normalized = key.toLowerCase();
    if (pressed) this.pressed.add(normalized);
    else this.pressed.delete(normalized);
  }

  get input(): Vector {
    const left = this.pressed.has('a') || this.pressed.has('arrowleft');
    const right = this.pressed.has('d') || this.pressed.has('arrowright');
    const up = this.pressed.has('w') || this.pressed.has('arrowup');
    const down = this.pressed.has('s') || this.pressed.has('arrowdown');
    return normalize(vec(Number(right) - Number(left), Number(down) - Number(up)));
  }

  get interactionHeld(): boolean {
    return this.pressed.has('f');
  }

  togglePause(): void {
    this.clearInput();
    this.controllers[this.controllers.length - 1]?.togglePause();
  }
  setPaused(paused: boolean): void {
    this.clearInput();
    this.controllers[this.controllers.length - 1]?.setPaused?.(paused);
  }
  restart(): void {
    this.clearInput();
    this.controllers[this.controllers.length - 1]?.restart();
  }
  killFaction(faction: Faction): void {
    this.controllers[this.controllers.length - 1]?.killFaction(faction);
  }
  cycleShrineSelection(direction: -1 | 1): void {
    this.controllers[this.controllers.length - 1]?.cycleShrineSelection(direction);
  }
  selectShrineFaction(faction: Faction): void {
    this.controllers[this.controllers.length - 1]?.selectShrineFaction(faction);
  }
  requestDash(): void {
    this.controllers[this.controllers.length - 1]?.requestDash();
  }
  applyVisualSettings(settings: Partial<VisualSettings>): void {
    this.controllers[this.controllers.length - 1]?.applyVisualSettings?.(settings);
  }

  clearInput(): void {
    this.pressed.clear();
  }

  reset(): void {
    this.listeners.clear();
    this.clearInput();
    this.controllers = [];
    this.latest = undefined;
  }
}

export const gameBridge = new GameBridge();

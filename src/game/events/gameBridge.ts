import { normalize, vec, type Vector } from '../math/vector';
import type { GameSnapshot } from '../simulation/Simulation';
import type { Faction } from '../config/factions';

type SnapshotListener = (snapshot: GameSnapshot) => void;
interface GameController {
  togglePause(): void;
  restart(): void;
  killFaction(faction: Faction): void;
}

class GameBridge {
  private listeners = new Set<SnapshotListener>();
  private pressed = new Set<string>();
  private controller?: GameController;
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

  bindController(controller?: GameController): void {
    this.controller = controller;
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

  togglePause(): void {
    this.controller?.togglePause();
  }
  restart(): void {
    this.controller?.restart();
  }
  killFaction(faction: Faction): void {
    this.controller?.killFaction(faction);
  }

  reset(): void {
    this.listeners.clear();
    this.pressed.clear();
    this.controller = undefined;
    this.latest = undefined;
  }
}

export const gameBridge = new GameBridge();

import type { Faction } from '../src/game/config/factions';
import type { GameSnapshot } from '../src/game/simulation/Simulation';

declare global {
  interface Window {
    __RPS_TEST__?: {
      snapshot: () => GameSnapshot | undefined;
      killFaction: (faction: Faction) => void;
      restart: () => void;
    };
  }
}

export {};

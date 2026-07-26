import { useEffect, useRef } from 'react';
import { gameBridge } from './events/gameBridge';
import type { MapId } from './maps/maps';
import type { DifficultyId, GameModeId } from './config/gameConfig';
import type { Faction } from './config/factions';
import type { VisualSettings } from './systems/gameFeel';

declare global {
  interface Window {
    __RPS_TEST__?: {
      snapshot: () => typeof gameBridge.latest;
      killFaction: (faction: 'rock' | 'paper' | 'scissors') => void;
      restart: () => void;
    };
  }
}

interface GameHandle {
  destroy(removeCanvas: boolean): void;
}

export type GameFactory = (
  parent: HTMLElement,
  signal: AbortSignal,
  mapId: MapId,
  matchOptions: {
    startingFaction: Faction;
    difficulty: DifficultyId;
    mode: GameModeId;
  },
  visualSettings: Partial<VisualSettings>,
) => Promise<GameHandle | undefined>;

async function defaultGameFactory(
  parent: HTMLElement,
  signal: AbortSignal,
  mapId: MapId,
  matchOptions: {
    startingFaction: Faction;
    difficulty: DifficultyId;
    mode: GameModeId;
  },
  visualSettings: Partial<VisualSettings>,
): Promise<GameHandle | undefined> {
  const { createGame } = await import('./createGame');
  if (signal.aborted) return undefined;
  return createGame(parent, mapId, visualSettings, matchOptions);
}

interface GameCanvasProps {
  onError?: (message: string) => void;
  gameFactory?: GameFactory;
  mapId?: MapId;
  startingFaction?: Faction;
  difficulty?: DifficultyId;
  mode?: GameModeId;
  visualSettings?: Partial<VisualSettings>;
}

export function GameCanvas({
  onError,
  gameFactory = defaultGameFactory,
  mapId = 'meadow',
  startingFaction = 'rock',
  difficulty = 'normal',
  mode = 'last-faction-standing',
  visualSettings = {},
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const initialVisualSettings = useRef(visualSettings);

  useEffect(() => {
    let disposed = false;
    let game: GameHandle | undefined;
    const startup = new AbortController();
    if (hostRef.current) {
      void gameFactory(
        hostRef.current,
        startup.signal,
        mapId,
        {
          startingFaction,
          difficulty,
          mode,
        },
        initialVisualSettings.current,
      )
        .then((createdGame) => {
          if (!createdGame) return;
          if (disposed) {
            createdGame.destroy(true);
            return;
          }
          game = createdGame;
        })
        .catch((error: unknown) => {
          if (!disposed)
            onError?.(error instanceof Error ? error.message : 'Unknown renderer error.');
        });
    }
    if (import.meta.env.MODE === 'test') {
      window.__RPS_TEST__ = {
        snapshot: () => gameBridge.latest,
        killFaction: (faction) => gameBridge.killFaction(faction),
        restart: () => gameBridge.restart(),
      };
    }
    return () => {
      disposed = true;
      startup.abort();
      game?.destroy(true);
      delete window.__RPS_TEST__;
    };
  }, [difficulty, gameFactory, mapId, mode, onError, startingFaction]);

  useEffect(() => {
    gameBridge.applyVisualSettings(visualSettings);
  }, [visualSettings]);

  return (
    <div
      ref={hostRef}
      className="game-canvas"
      data-testid="game-canvas"
      aria-label={`Active ${mapId} arena`}
    />
  );
}

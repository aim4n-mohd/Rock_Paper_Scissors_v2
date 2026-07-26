import { useEffect, useRef } from 'react';
import { gameBridge } from './events/gameBridge';
import type { MapId } from './maps/maps';

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
) => Promise<GameHandle | undefined>;

async function defaultGameFactory(
  parent: HTMLElement,
  signal: AbortSignal,
  mapId: MapId,
): Promise<GameHandle | undefined> {
  const { createGame } = await import('./createGame');
  if (signal.aborted) return undefined;
  return createGame(parent, mapId);
}

interface GameCanvasProps {
  onError?: (message: string) => void;
  gameFactory?: GameFactory;
  mapId?: MapId;
}

export function GameCanvas({
  onError,
  gameFactory = defaultGameFactory,
  mapId = 'meadow',
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let game: GameHandle | undefined;
    const startup = new AbortController();
    if (hostRef.current) {
      void gameFactory(hostRef.current, startup.signal, mapId)
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
  }, [gameFactory, mapId, onError]);

  return (
    <div
      ref={hostRef}
      className="game-canvas"
      data-testid="game-canvas"
      aria-label={`Active ${mapId} arena`}
    />
  );
}

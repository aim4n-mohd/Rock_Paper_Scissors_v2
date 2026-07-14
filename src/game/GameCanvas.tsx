import { useEffect, useRef } from 'react';
import { gameBridge } from './events/gameBridge';

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

export type GameFactory = (parent: HTMLElement) => Promise<GameHandle>;

async function defaultGameFactory(parent: HTMLElement): Promise<GameHandle> {
  const { createGame } = await import('./createGame');
  return createGame(parent);
}

interface GameCanvasProps {
  onError?: (message: string) => void;
  gameFactory?: GameFactory;
}

export function GameCanvas({ onError, gameFactory = defaultGameFactory }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let game: GameHandle | undefined;
    if (hostRef.current) {
      void gameFactory(hostRef.current)
        .then((createdGame) => {
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
      game?.destroy(true);
      gameBridge.bindController(undefined);
      delete window.__RPS_TEST__;
    };
  }, [gameFactory, onError]);

  return (
    <div
      ref={hostRef}
      className="game-canvas"
      data-testid="game-canvas"
      aria-label="Active meadow arena"
    />
  );
}

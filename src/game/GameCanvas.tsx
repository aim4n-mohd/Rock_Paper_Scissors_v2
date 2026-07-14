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

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let destroy: (() => void) | undefined;
    if (hostRef.current) {
      void import('./createGame').then(({ createGame }) => {
        if (disposed || !hostRef.current) return;
        const game = createGame(hostRef.current);
        destroy = () => game.destroy(true);
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
      destroy?.();
      gameBridge.bindController(undefined);
      delete window.__RPS_TEST__;
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="game-canvas"
      data-testid="game-canvas"
      aria-label="Active meadow arena"
    />
  );
}

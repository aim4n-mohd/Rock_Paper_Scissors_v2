import { useEffect, useState } from 'react';
import { GAME_CONFIG } from './game/config/gameConfig';
import { gameBridge } from './game/events/gameBridge';
import { GameCanvas } from './game/GameCanvas';
import type { GameSnapshot } from './game/simulation/Simulation';
import './styles.css';

const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'active',
  counts: { ...GAME_CONFIG.population },
  elapsedMs: 0,
  recruitedCount: 1,
  swarmCenter: { x: GAME_CONFIG.world.width / 2, y: GAME_CONFIG.world.height / 2 },
};

function timeLabel(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export function App() {
  const [started, setStarted] = useState(false);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);

  useEffect(() => gameBridge.subscribe(setSnapshot), []);

  useEffect(() => {
    if (!started) return;
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        gameBridge.setKey(key, pressed);
      }
      if (pressed && key === 'escape') {
        event.preventDefault();
        gameBridge.togglePause();
      }
      if (pressed && key === 'r') gameBridge.restart();
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [started]);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Rock Paper Scissors game">
        {started ? (
          <GameCanvas />
        ) : (
          <div className="meadow-placeholder" data-testid="game-container" />
        )}
        {started && (
          <header className="hud" aria-label="Match status">
            <span className="rock-count">
              Rocks <strong>{snapshot.counts.rock}</strong>
            </span>
            <span className="paper-count">
              Papers <strong>{snapshot.counts.paper}</strong>
            </span>
            <span className="scissors-count">
              Scissors <strong>{snapshot.counts.scissors}</strong>
            </span>
            <span className="timer">
              Time <strong>{timeLabel(snapshot.elapsedMs)}</strong>
            </span>
          </header>
        )}
        {!started && (
          <div className="overlay">
            <p className="eyebrow">A tiny faction arcade</p>
            <h1>Rock, Paper, Scissors v2.2</h1>
            <p>Control Rock. Hunt Scissors. Avoid Paper. Eliminate both factions.</p>
            <p className="controls">Move: WASD / Arrows · Pause: Esc · Restart: R</p>
            <button type="button" onClick={() => setStarted(true)}>
              Start game
            </button>
          </div>
        )}
        {started && snapshot.status === 'paused' && (
          <div className="overlay compact-overlay">
            <p className="eyebrow">Take a breath</p>
            <h2>Paused</h2>
            <p>WASD / Arrows to move · Esc to resume · R to restart</p>
            <button type="button" onClick={() => gameBridge.togglePause()}>
              Resume
            </button>
          </div>
        )}
        {started && (snapshot.status === 'victory' || snapshot.status === 'defeat') && (
          <div className="overlay compact-overlay">
            <p className="eyebrow">Match complete</p>
            <h2>{snapshot.status === 'victory' ? 'Meadow conquered!' : 'The Rocks are gone'}</h2>
            <p>
              Time {timeLabel(snapshot.elapsedMs)} · {snapshot.counts.rock} Rocks ·{' '}
              {snapshot.counts.paper} Papers · {snapshot.counts.scissors} Scissors
            </p>
            <button type="button" onClick={() => gameBridge.restart()}>
              Play again
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

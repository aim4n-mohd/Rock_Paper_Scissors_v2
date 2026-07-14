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
  const [gameError, setGameError] = useState<string>();
  const [gameAttempt, setGameAttempt] = useState(0);

  useEffect(() => gameBridge.subscribe(setSnapshot), []);

  useEffect(() => {
    if (!started) return;
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        gameBridge.setKey(key, pressed);
      }
      if (pressed && !event.repeat && key === 'escape') {
        event.preventDefault();
        gameBridge.togglePause();
      }
      if (pressed && !event.repeat && key === 'r') gameBridge.restart();
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    const clearInput = () => gameBridge.clearInput();
    const clearHiddenInput = () => {
      if (document.hidden) clearInput();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', clearHiddenInput);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', clearHiddenInput);
      clearInput();
    };
  }, [started]);

  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Rock Paper Scissors game">
        {started ? (
          <GameCanvas key={gameAttempt} onError={setGameError} />
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
            <button
              type="button"
              onClick={() => {
                setGameError(undefined);
                setStarted(true);
              }}
            >
              Start game
            </button>
          </div>
        )}
        {started && gameError && (
          <div className="overlay compact-overlay" role="alert">
            <p className="eyebrow">Renderer unavailable</p>
            <h2>Game could not start</h2>
            <p>{gameError}</p>
            <button
              type="button"
              onClick={() => {
                setGameError(undefined);
                setGameAttempt((attempt) => attempt + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}
        {started && !gameError && snapshot.status === 'paused' && (
          <div className="overlay compact-overlay">
            <p className="eyebrow">Take a breath</p>
            <h2>Paused</h2>
            <p>WASD / Arrows to move · Esc to resume · R to restart</p>
            <button type="button" onClick={() => gameBridge.togglePause()}>
              Resume
            </button>
          </div>
        )}
        {started &&
          !gameError &&
          (snapshot.status === 'victory' || snapshot.status === 'defeat') && (
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

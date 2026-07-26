import { useEffect, useState } from 'react';
import { FACTIONS, type Faction } from './game/config/factions';
import { GAME_CONFIG } from './game/config/gameConfig';
import { gameBridge } from './game/events/gameBridge';
import { GameCanvas } from './game/GameCanvas';
import { MAPS, type MapId } from './game/maps/maps';
import type { GameSnapshot } from './game/simulation/Simulation';
import './styles.css';

const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'active',
  mapId: 'meadow',
  playerFaction: 'rock',
  counts: { ...GAME_CONFIG.population },
  elapsedMs: 0,
  recruitedCount: 1,
  swarmCenter: { x: GAME_CONFIG.world.width / 2, y: GAME_CONFIG.world.height / 2 },
  shrine: {
    status: 'available',
    channelProgressMs: 0,
    channelDurationMs: GAME_CONFIG.shrine.channelDurationMs,
    usesRemaining: GAME_CONFIG.shrine.usesPerMatch,
    movementPenaltyRemainingMs: 0,
    transformationEffectRemainingMs: 0,
    cancelledFeedbackRemainingMs: 0,
    inRange: true,
    canActivate: false,
    sacrificePreview: 1,
    minimumRecruitedUnits: GAME_CONFIG.shrine.minimumRecruitedUnits,
  },
  dash: {
    phase: 'ready',
    ready: true,
    direction: { x: 0, y: 0 },
    activeRemainingMs: 0,
    cooldownRemainingMs: 0,
    cooldownMs:
      GAME_CONFIG.dash.baseCooldownMs * GAME_CONFIG.factionPassives.rock.dashCooldownMultiplier,
  },
};

function factionLabel(faction: Faction): string {
  return faction[0]!.toUpperCase() + faction.slice(1);
}

const FACTION_SYMBOLS: Record<Faction, string> = {
  rock: '●',
  paper: '▰',
  scissors: '✂',
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
  const [selectedMapId, setSelectedMapId] = useState<MapId>('meadow');

  useEffect(() => gameBridge.subscribe(setSnapshot), []);

  useEffect(() => {
    if (!started) return;
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault();
        gameBridge.setKey(key, pressed);
      }
      if (key === 'f') {
        event.preventDefault();
        gameBridge.setKey(key, pressed);
      }
      if (event.code === 'Space' || key === ' ') {
        event.preventDefault();
        if (pressed && !event.repeat) gameBridge.requestDash();
        return;
      }
      if (pressed && !event.repeat && (key === 'q' || key === 'e')) {
        event.preventDefault();
        gameBridge.cycleShrineSelection(key === 'q' ? -1 : 1);
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
          <GameCanvas
            key={`${gameAttempt}-${selectedMapId}`}
            mapId={selectedMapId}
            onError={setGameError}
          />
        ) : (
          <div className="meadow-placeholder" data-testid="game-container" />
        )}
        {started && (
          <header className="hud" aria-label="Match status">
            <span
              key={`rock-${snapshot.playerFaction === 'rock' ? snapshot.recruitedCount : 'idle'}`}
              className={`rock-count ${snapshot.playerFaction === 'rock' ? 'hud-count-pulse' : ''}`}
            >
              Rocks <strong>{snapshot.counts.rock}</strong>
            </span>
            <span
              key={`paper-${snapshot.playerFaction === 'paper' ? snapshot.recruitedCount : 'idle'}`}
              className={`paper-count ${
                snapshot.playerFaction === 'paper' ? 'hud-count-pulse' : ''
              }`}
            >
              Papers <strong>{snapshot.counts.paper}</strong>
            </span>
            <span
              key={`scissors-${
                snapshot.playerFaction === 'scissors' ? snapshot.recruitedCount : 'idle'
              }`}
              className={`scissors-count ${
                snapshot.playerFaction === 'scissors' ? 'hud-count-pulse' : ''
              }`}
            >
              Scissors <strong>{snapshot.counts.scissors}</strong>
            </span>
            <span className="timer">
              Time <strong>{timeLabel(snapshot.elapsedMs)}</strong>
            </span>
          </header>
        )}
        {started && !gameError && (
          <aside
            className={`shrine-panel shrine-${snapshot.shrine.status}`}
            aria-label="Triad Shrine"
          >
            <strong>Triad Shrine</strong>
            <div className="shrine-factions" role="group" aria-label="Choose shrine faction">
              {FACTIONS.map((faction) => (
                <button
                  key={faction}
                  type="button"
                  aria-label={factionLabel(faction)}
                  aria-pressed={snapshot.shrine.selectedFaction === faction}
                  disabled={faction === snapshot.playerFaction || snapshot.shrine.status === 'used'}
                  onClick={() => gameBridge.selectShrineFaction(faction)}
                >
                  <span aria-hidden="true">{FACTION_SYMBOLS[faction]}</span>
                  {factionLabel(faction)}
                </button>
              ))}
            </div>
            {snapshot.shrine.transformationEffectRemainingMs > 0 ? (
              <span className="shrine-transforming">
                Transforming into{' '}
                {snapshot.shrine.selectedFaction
                  ? factionLabel(snapshot.shrine.selectedFaction)
                  : factionLabel(snapshot.playerFaction)}
              </span>
            ) : snapshot.shrine.status === 'used' ? (
              <span>Shrine dormant</span>
            ) : (
              <>
                <span>
                  {snapshot.shrine.inRange
                    ? snapshot.recruitedCount < snapshot.shrine.minimumRecruitedUnits
                      ? `Need ${snapshot.shrine.minimumRecruitedUnits} recruited units`
                      : 'Q / E select · Hold F to channel'
                    : 'Return to the central shrine'}
                </span>
                <span>
                  Selected{' '}
                  <b>
                    {snapshot.shrine.selectedFaction
                      ? factionLabel(snapshot.shrine.selectedFaction)
                      : 'None'}
                  </b>
                </span>
                <span>
                  Sacrifice {snapshot.shrine.sacrificePreview} of {snapshot.recruitedCount}
                </span>
                {snapshot.shrine.cancelledFeedbackRemainingMs > 0 && (
                  <span className="shrine-cancelled">Channel cancelled</span>
                )}
                {snapshot.shrine.status === 'channeling' && (
                  <progress
                    aria-label="Shrine channel"
                    value={snapshot.shrine.channelProgressMs}
                    max={snapshot.shrine.channelDurationMs}
                    aria-valuenow={Math.round(
                      (snapshot.shrine.channelProgressMs / snapshot.shrine.channelDurationMs) * 100,
                    )}
                  />
                )}
              </>
            )}
            {snapshot.shrine.movementPenaltyRemainingMs > 0 && (
              <span className="shrine-penalty">Transformation fatigue</span>
            )}
          </aside>
        )}
        {started && !gameError && import.meta.env.DEV && (
          <label className="development-map-selector">
            Development map
            <select
              value={selectedMapId}
              onChange={(event) => {
                gameBridge.clearInput();
                setSelectedMapId(event.target.value as MapId);
              }}
            >
              {MAPS.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        {!started && (
          <div className="overlay">
            <p className="eyebrow">A tiny faction arcade</p>
            <h1>Rock, Paper, Scissors v2.2</h1>
            <p>Begin as Rock. Recruit allies, hunt prey, and outlast both rival factions.</p>
            <p className="controls">
              Move: WASD / Arrows · Dash: Space · Shrine: Q/E + hold F · Pause: Esc · Restart: R
            </p>
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
            <p>
              WASD / Arrows to move · Space to dash · Q/E + hold F at shrine · Esc to resume · R to
              restart
            </p>
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
              <h2>
                {snapshot.status === 'victory'
                  ? 'Meadow conquered!'
                  : `The ${factionLabel(snapshot.playerFaction)} swarm is gone`}
              </h2>
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

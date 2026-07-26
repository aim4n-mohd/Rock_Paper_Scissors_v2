import { useEffect, useMemo, useRef, useState } from 'react';
import { FACTIONS, type Faction } from './game/config/factions';
import { GAME_CONFIG } from './game/config/gameConfig';
import { gameBridge } from './game/events/gameBridge';
import { GameCanvas } from './game/GameCanvas';
import { getMapDefinition } from './game/maps/maps';
import {
  createRecordKey,
  loadLocalRecords,
  saveLocalRecord,
  type MatchRecord,
  type RecordSelection,
} from './game/persistence/localRecords';
import {
  loadPlayerPreferences,
  saveMatchSelection,
  savePlayerSettings,
  setTutorialCompleted,
  type PlayerSettings,
} from './game/persistence/playerPreferences';
import type { GameSnapshot } from './game/simulation/Simulation';
import { HowToPlay } from './ui/HowToPlay';
import { LandingBackground } from './ui/LandingBackground';
import { MatchSetup, type PartialMatchSelection } from './ui/MatchSetup';
import { SettingsPanel } from './ui/SettingsPanel';
import { TutorialExperience } from './ui/TutorialExperience';
import './styles.css';

type AppView = 'landing' | 'setup' | 'match';
type Panel = 'how' | 'settings' | 'tutorial-intro' | 'tutorial' | null;

const INITIAL_SNAPSHOT: GameSnapshot = {
  status: 'active',
  mapId: 'meadow',
  startingFaction: 'rock',
  playerFaction: 'rock',
  difficulty: 'normal',
  mode: 'last-faction-standing',
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
    inRange: false,
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
    cooldownMs: GAME_CONFIG.dash.baseCooldownMs,
  },
  score: { current: 0, preyKills: 0, predatorKills: 0, killPoints: 0 },
};

const SYMBOLS: Record<Faction, string> = { rock: '●', paper: '▱', scissors: '✂' };
const FACTION_PLURALS: Record<Faction, string> = {
  rock: 'Rocks',
  paper: 'Papers',
  scissors: 'Scissors',
};

function label(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}

function timeLabel(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function completeSelection(selection: PartialMatchSelection): selection is RecordSelection {
  return Boolean(
    selection.mapId && selection.startingFaction && selection.difficulty && selection.mode,
  );
}

function Hud({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <header className="hud" aria-label="Match status">
      {FACTIONS.map((faction) => (
        <span
          key={`${faction}-${snapshot.playerFaction === faction ? snapshot.recruitedCount : 'idle'}`}
          className={`${faction}-count ${snapshot.playerFaction === faction ? 'hud-count-pulse' : ''}`}
        >
          {FACTION_PLURALS[faction]} <strong>{snapshot.counts[faction]}</strong>
        </span>
      ))}
      <span className="timer">
        {snapshot.remainingMs === undefined ? 'Time' : 'Remaining'}{' '}
        <strong>{timeLabel(snapshot.remainingMs ?? snapshot.elapsedMs)}</strong>
      </span>
      <span className="score">
        Score <strong>{snapshot.score.current}</strong>
      </span>
    </header>
  );
}

function ShrinePanel({ snapshot }: { snapshot: GameSnapshot }) {
  return (
    <aside className={`shrine-panel shrine-${snapshot.shrine.status}`} aria-label="Triad Shrine">
      <strong>Triad Shrine</strong>
      <div className="shrine-factions" role="group" aria-label="Choose shrine faction">
        {FACTIONS.map((faction) => (
          <button
            key={faction}
            type="button"
            aria-label={label(faction)}
            aria-pressed={snapshot.shrine.selectedFaction === faction}
            disabled={faction === snapshot.playerFaction || snapshot.shrine.status === 'used'}
            onClick={() => gameBridge.selectShrineFaction(faction)}
          >
            <span aria-hidden="true">{SYMBOLS[faction]}</span>
            {label(faction)}
          </button>
        ))}
      </div>
      {snapshot.shrine.transformationEffectRemainingMs > 0 ? (
        <span className="shrine-transforming">Transformation in progress</span>
      ) : snapshot.shrine.status === 'used' ? (
        <span>Shrine dormant</span>
      ) : (
        <>
          <span>
            {!snapshot.shrine.inRange
              ? 'Return to the central shrine'
              : snapshot.recruitedCount < snapshot.shrine.minimumRecruitedUnits
                ? `Need ${snapshot.shrine.minimumRecruitedUnits} recruited units`
                : 'Q / E select · Hold F to channel'}
          </span>
          <span>
            Selected{' '}
            <b>
              {snapshot.shrine.selectedFaction ? label(snapshot.shrine.selectedFaction) : 'None'}
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
  );
}

export function App() {
  const initialPreferences = useMemo(
    () => (typeof window === 'undefined' ? undefined : loadPlayerPreferences(window.localStorage)),
    [],
  );
  const [view, setView] = useState<AppView>('landing');
  const [panel, setPanel] = useState<Panel>(null);
  const [panelOrigin, setPanelOrigin] = useState<AppView>('landing');
  const [selection, setSelection] = useState<PartialMatchSelection>(
    initialPreferences?.selection ?? {},
  );
  const [settings, setSettings] = useState<PlayerSettings>(
    initialPreferences?.settings ?? loadPlayerPreferences(localStorage).settings,
  );
  const [tutorialDone, setTutorialDone] = useState(initialPreferences?.tutorialCompleted ?? false);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [gameError, setGameError] = useState<string>();
  const [gameAttempt, setGameAttempt] = useState(0);
  const [bestRecord, setBestRecord] = useState<MatchRecord>();
  const [newRecord, setNewRecord] = useState(false);
  const recordedResult = useRef<string>();

  useEffect(() => gameBridge.subscribe(setSnapshot), []);

  useEffect(() => {
    if (view !== 'match' || snapshot.status === 'active') {
      if (snapshot.status === 'active') recordedResult.current = undefined;
      return;
    }
    if (snapshot.status !== 'victory' || !snapshot.score.final || typeof window === 'undefined') {
      setBestRecord(undefined);
      setNewRecord(false);
      return;
    }
    const selectionKey: RecordSelection = {
      mapId: snapshot.mapId,
      startingFaction: snapshot.startingFaction,
      difficulty: snapshot.difficulty,
      mode: snapshot.mode,
    };
    const resultKey = `${createRecordKey(selectionKey)}|${snapshot.elapsedMs}|${snapshot.score.final.finalScore}`;
    if (recordedResult.current === resultKey) return;
    recordedResult.current = resultKey;
    const previous = loadLocalRecords(window.localStorage)[createRecordKey(selectionKey)];
    const isNew =
      !previous ||
      snapshot.score.final.finalScore > previous.bestScore ||
      snapshot.elapsedMs < previous.bestCompletionTimeMs;
    const saved = saveLocalRecord(window.localStorage, selectionKey, {
      score: snapshot.score.final.finalScore,
      completionTimeMs: snapshot.elapsedMs,
      achievedAt: new Date().toISOString(),
      finalSurvivingUnitCount: snapshot.recruitedCount,
    });
    setBestRecord(saved);
    setNewRecord(isNew);
  }, [snapshot, view]);

  useEffect(() => {
    if (view !== 'match' || panel) return;
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      const key = event.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'f'].includes(key)
      ) {
        event.preventDefault();
        gameBridge.setKey(key, pressed);
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (pressed && !event.repeat) gameBridge.requestDash();
      } else if (pressed && !event.repeat && (key === 'q' || key === 'e')) {
        event.preventDefault();
        gameBridge.cycleShrineSelection(key === 'q' ? -1 : 1);
      } else if (pressed && !event.repeat && key === 'escape') {
        event.preventDefault();
        gameBridge.togglePause();
      } else if (pressed && !event.repeat && key === 'r') {
        gameBridge.restart();
      }
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    const clear = () => gameBridge.clearInput();
    const hidden = () => {
      if (document.hidden) clear();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', hidden);
      clear();
    };
  }, [panel, view]);

  const openPanel = (next: Exclude<Panel, null>) => {
    setPanelOrigin(view);
    if (view === 'match') gameBridge.setPaused(true);
    setPanel(next);
  };

  const closePanel = () => setPanel(null);
  const updateSettings = (next: PlayerSettings) => {
    setSettings(next);
    savePlayerSettings(localStorage, next);
  };
  const saveTutorial = () => {
    setTutorialDone(true);
    setTutorialCompleted(localStorage, true);
  };
  const beginSelectedMatch = () => {
    if (!completeSelection(selection)) return;
    saveMatchSelection(localStorage, selection);
    setSnapshot({
      ...INITIAL_SNAPSHOT,
      mapId: selection.mapId,
      startingFaction: selection.startingFaction,
      playerFaction: selection.startingFaction,
      difficulty: selection.difficulty,
      mode: selection.mode,
    });
    setGameError(undefined);
    setView('match');
    setPanel(null);
    setGameAttempt((attempt) => attempt + 1);
  };
  const requestMatch = () => {
    if (!completeSelection(selection)) return;
    saveMatchSelection(localStorage, selection);
    if (tutorialDone) beginSelectedMatch();
    else {
      setPanelOrigin('setup');
      setPanel('tutorial-intro');
    }
  };
  const finishTutorial = () => {
    saveTutorial();
    if (panelOrigin === 'setup') beginSelectedMatch();
    else setPanel('how');
  };
  const quitToMenu = () => {
    gameBridge.clearInput();
    setPanel(null);
    setGameError(undefined);
    setSnapshot(INITIAL_SNAPSHOT);
    setView('landing');
  };
  const resume = () => {
    gameBridge.setPaused(false);
    setSnapshot((current) => ({ ...current, status: 'active' }));
    setPanel(null);
  };

  const isPaused = view === 'match' && snapshot.status === 'paused' && !panel;
  const isResult =
    view === 'match' && (snapshot.status === 'victory' || snapshot.status === 'defeat');

  return (
    <main
      className={`app-shell ${settings.reducedMotion ? 'reduced-motion' : ''} ${settings.reducedFlashes ? 'reduced-flashes' : ''}`}
      style={{ '--particle-intensity': settings.particleIntensity } as React.CSSProperties}
    >
      {view === 'landing' && (
        <section className="landing-screen" aria-hidden={panel ? true : undefined}>
          <LandingBackground />
          <div className="landing-scrim" />
          <div className="landing-content">
            <p className="eyebrow">A swarm arcade</p>
            <h1>Rock Paper Scissors 2</h1>
            <p>Build your swarm. Hunt your prey. Become what hunts you.</p>
            <div className="menu-actions vertical">
              <button type="button" className="primary large" onClick={() => setView('setup')}>
                Play
              </button>
              <button type="button" onClick={() => openPanel('how')}>
                How to Play
              </button>
              <button type="button" onClick={() => openPanel('settings')}>
                Settings
              </button>
            </div>
          </div>
        </section>
      )}

      {view === 'setup' && (
        <div className="view-layer" aria-hidden={panel ? true : undefined}>
          <MatchSetup
            selection={selection}
            onChange={setSelection}
            onPlay={requestMatch}
            onBack={() => setView('landing')}
          />
        </div>
      )}

      {view === 'match' && completeSelection(selection) && (
        <section
          className="game-frame"
          aria-label="Rock Paper Scissors game"
          aria-hidden={panel ? true : undefined}
        >
          <GameCanvas
            key={`${gameAttempt}-${selection.mapId}-${selection.startingFaction}-${selection.difficulty}-${selection.mode}`}
            mapId={selection.mapId}
            startingFaction={selection.startingFaction}
            difficulty={selection.difficulty}
            mode={selection.mode}
            visualSettings={settings}
            onError={setGameError}
          />
          <Hud snapshot={snapshot} />
          {!gameError && <ShrinePanel snapshot={snapshot} />}
          {gameError && (
            <section className="overlay compact-overlay" role="alert">
              <p className="eyebrow">Renderer unavailable</p>
              <h2>Game could not start</h2>
              <p>{gameError}</p>
              <button
                type="button"
                onClick={() => {
                  setGameError(undefined);
                  setGameAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
              <button type="button" onClick={quitToMenu}>
                Main Menu
              </button>
            </section>
          )}
          {isPaused && (
            <section className="overlay compact-overlay" role="dialog" aria-label="Pause menu">
              <p className="eyebrow">Take a breath</p>
              <h2>Paused</h2>
              <div className="menu-actions vertical">
                <button type="button" className="primary" onClick={resume}>
                  Resume
                </button>
                <button
                  type="button"
                  onClick={() => {
                    gameBridge.restart();
                    setSnapshot((current) => ({ ...current, status: 'active' }));
                  }}
                >
                  Restart
                </button>
                <button type="button" onClick={() => openPanel('how')}>
                  How to Play
                </button>
                <button type="button" onClick={() => openPanel('settings')}>
                  Settings
                </button>
                <button type="button" className="danger" onClick={quitToMenu}>
                  Quit to Main Menu
                </button>
              </div>
            </section>
          )}
          {isResult && snapshot.score.final && (
            <section
              className="overlay results-screen"
              role="dialog"
              aria-label={`${snapshot.status} results`}
            >
              <p className="eyebrow">Match complete</p>
              <h2>{snapshot.status === 'victory' ? 'Victory' : 'Defeat'}</h2>
              {newRecord && <strong className="new-record">New record!</strong>}
              <div className="score-hero">
                <span>Final score</span>
                <strong>{snapshot.score.final.finalScore.toLocaleString()}</strong>
              </div>
              <dl className="results-grid">
                <div>
                  <dt>Best score</dt>
                  <dd>
                    {(bestRecord?.bestScore ?? snapshot.score.final.finalScore).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt>{snapshot.status === 'victory' ? 'Completion time' : 'Survival time'}</dt>
                  <dd>{timeLabel(snapshot.elapsedMs)}</dd>
                </div>
                {bestRecord && (
                  <div>
                    <dt>Best time</dt>
                    <dd>{timeLabel(bestRecord.bestCompletionTimeMs)}</dd>
                  </div>
                )}
                <div>
                  <dt>Total kills</dt>
                  <dd>{snapshot.score.preyKills + snapshot.score.predatorKills}</dd>
                </div>
                <div>
                  <dt>Remaining recruited units</dt>
                  <dd>{snapshot.recruitedCount}</dd>
                </div>
                <div>
                  <dt>Map</dt>
                  <dd>{getMapDefinition(snapshot.mapId).displayName}</dd>
                </div>
                <div>
                  <dt>Starting faction</dt>
                  <dd>{label(snapshot.startingFaction)}</dd>
                </div>
                <div>
                  <dt>Final faction</dt>
                  <dd>{label(snapshot.playerFaction)}</dd>
                </div>
                <div>
                  <dt>Difficulty</dt>
                  <dd>{GAME_CONFIG.difficulties[snapshot.difficulty].displayName}</dd>
                </div>
                <div>
                  <dt>Game mode</dt>
                  <dd>{GAME_CONFIG.gameModes[snapshot.mode].displayName}</dd>
                </div>
              </dl>
              <div className="menu-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    gameBridge.restart();
                    setSnapshot((current) => ({ ...current, status: 'active' }));
                  }}
                >
                  Play Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('setup');
                    setPanel(null);
                  }}
                >
                  Change Setup
                </button>
                <button type="button" onClick={quitToMenu}>
                  Main Menu
                </button>
              </div>
            </section>
          )}
        </section>
      )}

      {panel === 'tutorial-intro' && (
        <section
          className="panel-screen tutorial-intro"
          role="dialog"
          aria-modal="true"
          aria-labelledby="intro-title"
        >
          <p className="eyebrow">First hunt</p>
          <h2 id="intro-title">Learn the hunt</h2>
          <p>
            A short interactive lesson introduces movement, recruitment, combat, escape, dash, and
            the Triad Shrine.
          </p>
          <div className="menu-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => {
                saveTutorial();
                beginSelectedMatch();
              }}
            >
              Skip Tutorial
            </button>
            <button type="button" className="primary" onClick={() => setPanel('tutorial')}>
              Begin Tutorial
            </button>
          </div>
        </section>
      )}
      {panel === 'tutorial' && (
        <TutorialExperience onComplete={finishTutorial} onSkip={finishTutorial} />
      )}
      {panel === 'how' && (
        <HowToPlay
          returnLabel={panelOrigin === 'match' ? 'Back to Pause' : 'Back'}
          onClose={closePanel}
          onReplayTutorial={() => setPanel('tutorial')}
        />
      )}
      {panel === 'settings' && (
        <SettingsPanel
          settings={settings}
          returnLabel={panelOrigin === 'match' ? 'Back to Pause' : 'Back'}
          onChange={updateSettings}
          onClose={closePanel}
          onFullscreen={() => {
            const entering = !document.fullscreenElement;
            void Promise.resolve(
              entering
                ? document.documentElement.requestFullscreen?.()
                : document.exitFullscreen?.(),
            ).catch(() => undefined);
            updateSettings({ ...settings, fullscreen: entering });
          }}
        />
      )}
    </main>
  );
}

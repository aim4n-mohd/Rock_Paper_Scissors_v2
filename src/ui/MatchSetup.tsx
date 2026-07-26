import { FACTIONS, type Faction } from '../game/config/factions';
import {
  DIFFICULTY_IDS,
  GAME_CONFIG,
  GAME_MODE_IDS,
  type DifficultyId,
  type GameModeId,
} from '../game/config/gameConfig';
import { MAPS, type MapId } from '../game/maps/maps';
import type { RecordSelection } from '../game/persistence/localRecords';

export type PartialMatchSelection = Partial<RecordSelection>;

const FACTION_DESCRIPTIONS: Record<Faction, string> = {
  rock: 'Heavy momentum and powerful knockback',
  paper: 'Fast acceleration and wider swarm movement',
  scissors: 'Sharp turning and faster dash recovery',
};

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyId, string> = {
  casual: 'Gentler reactions and faster player dashes.',
  normal: 'The intended balanced arcade challenge.',
  chaos: 'More enemies, faster hunters, larger rewards.',
};

const MODE_TIMER: Record<GameModeId, string> = {
  'last-faction-standing': 'Eliminate both rival factions. No time limit.',
  blitz: 'Eliminate both rivals before the three-minute timer expires.',
};

function label(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}

function Card({
  name,
  description,
  selected,
  onClick,
  children,
}: {
  name: string;
  description: string;
  selected: boolean;
  onClick(): void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`selection-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
      <strong>{name}</strong>
      <span>{description}</span>
    </button>
  );
}

export function MatchSetup({
  selection,
  onChange,
  onPlay,
  onBack,
}: {
  selection: PartialMatchSelection;
  onChange(selection: PartialMatchSelection): void;
  onPlay(): void;
  onBack(): void;
}) {
  const complete =
    selection.mapId !== undefined &&
    selection.startingFaction !== undefined &&
    selection.difficulty !== undefined &&
    selection.mode !== undefined;
  return (
    <section className="menu-screen setup-screen" aria-labelledby="setup-title">
      <p className="eyebrow">Prepare the arena</p>
      <h1 id="setup-title">Choose your match</h1>

      <fieldset className="selection-row">
        <legend>Starting faction</legend>
        <div className="card-grid three">
          {FACTIONS.map((faction) => (
            <Card
              key={faction}
              name={label(faction)}
              description={FACTION_DESCRIPTIONS[faction]}
              selected={selection.startingFaction === faction}
              onClick={() => onChange({ ...selection, startingFaction: faction })}
            >
              <span className={`faction-glyph ${faction}`} aria-hidden="true" />
            </Card>
          ))}
        </div>
      </fieldset>

      <fieldset className="selection-row">
        <legend>Difficulty</legend>
        <div className="card-grid three">
          {DIFFICULTY_IDS.map((difficulty) => (
            <Card
              key={difficulty}
              name={GAME_CONFIG.difficulties[difficulty].displayName}
              description={`${DIFFICULTY_DESCRIPTIONS[difficulty]} ${GAME_CONFIG.difficulties[difficulty].scoreMultiplier}× score`}
              selected={selection.difficulty === difficulty}
              onClick={() => onChange({ ...selection, difficulty })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="selection-row">
        <legend>Game mode</legend>
        <div className="card-grid two">
          {GAME_MODE_IDS.map((mode) => (
            <Card
              key={mode}
              name={GAME_CONFIG.gameModes[mode].displayName}
              description={`${MODE_TIMER[mode]} ${GAME_CONFIG.gameModes[mode].scoreMultiplier}× score`}
              selected={selection.mode === mode}
              onClick={() => onChange({ ...selection, mode })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="selection-row">
        <legend>Map</legend>
        <div className="card-grid three">
          {MAPS.map((map) => (
            <Card
              key={map.id}
              name={map.displayName}
              description={map.description}
              selected={selection.mapId === map.id}
              onClick={() => onChange({ ...selection, mapId: map.id as MapId })}
            >
              <span
                className={`map-preview map-${map.preview.pattern}`}
                style={
                  {
                    '--map-base': `#${map.preview.baseColor.toString(16).padStart(6, '0')}`,
                    '--map-accent': `#${map.preview.accentColor.toString(16).padStart(6, '0')}`,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              />
            </Card>
          ))}
        </div>
      </fieldset>

      <div className="menu-actions setup-actions">
        <button type="button" className="secondary" onClick={onBack}>
          Back to main menu
        </button>
        <button type="button" className="primary large" disabled={!complete} onClick={onPlay}>
          Play match
        </button>
      </div>
    </section>
  );
}

import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import { MinimapCoordinateMapper } from './MinimapCoordinateMapper';
import { buildMinimapMarkers } from './minimapModel';

describe('buildMinimapMarkers', () => {
  const mapper = new MinimapCoordinateMapper(
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 10, y: 20, width: 50, height: 50 },
  );

  it('includes all living factions and filters dead units', () => {
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 }, true);
    const neutral = createUnit('neutral', 'rock', { x: 25, y: 25 });
    const paper = createUnit('paper', 'paper', { x: 50, y: 50 });
    const scissors = createUnit('scissors', 'scissors', { x: 100, y: 100 });
    const dead = createUnit('dead', 'paper', { x: 75, y: 75 });
    dead.alive = false;

    const markers = buildMinimapMarkers(
      [rock, neutral, paper, scissors, dead],
      'rock',
      mapper,
      GAME_CONFIG.minimap,
    );

    expect(markers.map((marker) => marker.id)).toEqual(['rock', 'neutral', 'paper', 'scissors']);
    expect(markers.map((marker) => marker.faction)).toEqual(['rock', 'rock', 'paper', 'scissors']);
  });

  it('makes recruited Rocks prominent, dims neutral Rocks, and marks the anchor', () => {
    const anchor = createUnit('anchor', 'rock', { x: 20, y: 20 }, true);
    const recruited = createUnit('recruited', 'rock', { x: 30, y: 30 }, true);
    const neutral = createUnit('neutral', 'rock', { x: 40, y: 40 });

    const markers = buildMinimapMarkers(
      [anchor, recruited, neutral],
      'anchor',
      mapper,
      GAME_CONFIG.minimap,
    );

    expect(markers[0]).toMatchObject({
      size: GAME_CONFIG.minimap.playerMarkerSize,
      alpha: 1,
      isAnchor: true,
    });
    expect(markers[1]).toMatchObject({
      size: GAME_CONFIG.minimap.playerMarkerSize,
      alpha: 1,
      isAnchor: false,
    });
    expect(markers[2]).toMatchObject({
      size: GAME_CONFIG.minimap.unitMarkerSize,
      alpha: GAME_CONFIG.minimap.neutralMarkerAlpha,
      isAnchor: false,
    });
  });

  it('reads the current faction every update so faction changes are reflected immediately', () => {
    const unit = createUnit('unit', 'rock', { x: 50, y: 50 });
    expect(buildMinimapMarkers([unit], undefined, mapper, GAME_CONFIG.minimap)[0]?.faction).toBe(
      'rock',
    );

    unit.faction = 'paper';
    expect(buildMinimapMarkers([unit], undefined, mapper, GAME_CONFIG.minimap)[0]?.faction).toBe(
      'paper',
    );
  });
});

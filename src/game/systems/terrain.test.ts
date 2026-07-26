import { GAME_CONFIG } from '../config/gameConfig';
import { getMapDefinition } from '../maps/maps';
import { terrainMovementModifiers } from './terrain';

describe('terrain movement modifiers', () => {
  it('slows speed and acceleration for player and independent units in Marsh mud', () => {
    const marsh = getMapDefinition('marsh');
    const mud = marsh.terrainRegions.find((region) => region.kind === 'mud')!;
    const position = { x: mud.x + mud.width / 2, y: mud.y + mud.height / 2 };

    expect(terrainMovementModifiers(marsh, position, 'paper')).toEqual({
      speedMultiplier: GAME_CONFIG.terrain.mud.speedMultiplier,
      accelerationMultiplier: GAME_CONFIG.terrain.mud.accelerationMultiplier,
    });
  });

  it('gives Rock its configured resistance and leaves dry terrain unchanged', () => {
    const marsh = getMapDefinition('marsh');
    const mud = marsh.terrainRegions.find((region) => region.kind === 'mud')!;
    const mudPosition = { x: mud.x + mud.width / 2, y: mud.y + mud.height / 2 };

    const rock = terrainMovementModifiers(marsh, mudPosition, 'rock');
    const paper = terrainMovementModifiers(marsh, mudPosition, 'paper');
    expect(rock.speedMultiplier).toBeGreaterThan(paper.speedMultiplier);
    expect(rock.accelerationMultiplier).toBeGreaterThan(paper.accelerationMultiplier);
    expect(terrainMovementModifiers(marsh, marsh.shrine, 'rock')).toEqual({
      speedMultiplier: 1,
      accelerationMultiplier: 1,
    });
  });
});

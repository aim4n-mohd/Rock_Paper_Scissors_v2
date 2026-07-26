import { GAME_CONFIG } from '../config/gameConfig';
import { distance } from '../math/vector';
import { getMapDefinition, MAP_IDS } from '../maps/maps';
import { Simulation } from './Simulation';

describe('map-driven simulation', () => {
  it.each(MAP_IDS)('loads and restarts the selected %s map deterministically', (mapId) => {
    const simulation = new Simulation(31, { mapId });
    const initial = simulation.units.map((unit) => ({ id: unit.id, position: unit.position }));

    expect(simulation.snapshot().mapId).toBe(mapId);
    simulation.restart(31);

    expect(simulation.snapshot().mapId).toBe(mapId);
    expect(simulation.units.map((unit) => ({ id: unit.id, position: unit.position }))).toEqual(
      initial,
    );
  });

  it('keeps dash movement outside large tree trunks', () => {
    const map = getMapDefinition('forest');
    const tree = map.obstacles.find((obstacle) => obstacle.kind === 'tree')!;
    const simulation = new Simulation(12, { mapId: 'forest' });
    const anchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    anchor.position = {
      x: tree.position.x - tree.collisionRadius - anchor.radius - 8,
      y: tree.position.y,
    };
    anchor.velocity = { x: 0, y: 0 };
    Object.assign(simulation, { playerTarget: { ...anchor.position } });

    simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 1, y: 0 });
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
    for (let index = 0; index < 40; index += 1)
      simulation.update(GAME_CONFIG.simulation.fixedStepMs, { x: 1, y: 0 });

    expect(distance(anchor.position, tree.position)).toBeGreaterThanOrEqual(
      tree.collisionRadius + anchor.radius + GAME_CONFIG.visuals.treeCollisionSkin - 0.001,
    );
  });

  it('applies Marsh mud to recruited and independent movement without disabling dash', () => {
    const map = getMapDefinition('marsh');
    const mud = map.terrainRegions.find((region) => region.kind === 'mud')!;
    const simulation = new Simulation(18, { mapId: 'marsh' });
    const anchor = simulation.units.find((unit) => unit.id === simulation.anchorId)!;
    const independent = simulation.units.find((unit) => !unit.recruited)!;
    const position = { x: mud.x + mud.width / 2, y: mud.y + mud.height / 2 };
    anchor.position = { ...position };
    independent.position = { x: position.x + 40, y: position.y };
    Object.assign(simulation, { playerTarget: { ...anchor.position } });

    simulation.update(250, { x: 1, y: 0 });

    expect(anchor.velocity.x).toBeGreaterThan(0);
    expect(anchor.velocity.x).toBeLessThan(simulation.currentEffectiveSwarmSpeed());
    expect(independent.velocity.x).toBeLessThan(independent.motion.maxSpeed);
    expect(simulation.requestDash({ x: 1, y: 0 })).toBe(true);
  });
});

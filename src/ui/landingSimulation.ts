import { Simulation } from '../game/simulation/Simulation';

const LANDING_SEED = 62026;

export function createLandingSimulation(): Simulation {
  const simulation = new Simulation(LANDING_SEED, {
    mapId: 'meadow',
    shrine: { enabled: false },
    visualSettings: {
      screenShake: false,
      particleIntensity: 0.15,
      reducedMotion: true,
      reducedFlashes: true,
    },
  });
  simulation.units = simulation.units
    .filter(
      (unit) =>
        simulation.units.filter((other) => other.faction === unit.faction).indexOf(unit) < 4,
    )
    .map((unit) => ({ ...unit, recruited: false, intent: 'wander' as const }));
  simulation.anchorId = undefined;
  return simulation;
}

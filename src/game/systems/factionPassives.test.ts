import { GAME_CONFIG } from '../config/gameConfig';
import { createUnit } from '../model/unit';
import {
  applyPlayerMotionPassives,
  applySwarmResponsePassive,
  applySwarmSpreadPassive,
} from './factionPassives';

describe('configuration-driven faction passives', () => {
  it('applies lower-momentum Rock acceleration and faster Paper acceleration', () => {
    const rock = applyPlayerMotionPassives(
      GAME_CONFIG.units.motion,
      GAME_CONFIG.playerMovement,
      GAME_CONFIG.factionPassives.rock,
    );
    const paper = applyPlayerMotionPassives(
      GAME_CONFIG.units.motion,
      GAME_CONFIG.playerMovement,
      GAME_CONFIG.factionPassives.paper,
    );

    expect(rock.acceleration).toBeLessThan(GAME_CONFIG.playerMovement.acceleration);
    expect(rock.deceleration).toBeLessThan(GAME_CONFIG.playerMovement.deceleration);
    expect(paper.acceleration).toBeGreaterThan(GAME_CONFIG.playerMovement.acceleration);
  });

  it('gives Paper wider spacing and Scissors tighter, faster response', () => {
    expect(
      applySwarmSpreadPassive(GAME_CONFIG.swarm.offsetRadius, GAME_CONFIG.factionPassives.paper),
    ).toBeGreaterThan(GAME_CONFIG.swarm.offsetRadius);
    expect(
      applySwarmSpreadPassive(GAME_CONFIG.swarm.offsetRadius, GAME_CONFIG.factionPassives.scissors),
    ).toBeLessThan(GAME_CONFIG.swarm.offsetRadius);
    expect(
      applySwarmResponsePassive(GAME_CONFIG.swarm.cohesion, GAME_CONFIG.factionPassives.scissors),
    ).toBeGreaterThan(GAME_CONFIG.swarm.cohesion);
  });

  it('changes only the relevant derived modifiers when a fixture faction changes', () => {
    const fixture = createUnit('fixture', 'rock', { x: 0, y: 0 }, true);
    const rockMotion = applyPlayerMotionPassives(
      fixture.motion,
      GAME_CONFIG.playerMovement,
      GAME_CONFIG.factionPassives[fixture.faction],
    );

    fixture.faction = 'scissors';
    const scissorsMotion = applyPlayerMotionPassives(
      fixture.motion,
      GAME_CONFIG.playerMovement,
      GAME_CONFIG.factionPassives[fixture.faction],
    );

    expect(scissorsMotion.maxSpeed).toBe(rockMotion.maxSpeed);
    expect(scissorsMotion.maxTurnRate).toBeGreaterThan(rockMotion.maxTurnRate);
    expect(fixture.motion).toEqual(GAME_CONFIG.units.motion);
  });
});

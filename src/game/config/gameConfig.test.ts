import { GAME_CONFIG, validateConfig } from './gameConfig';
import { distance } from '../math/vector';

describe('game configuration', () => {
  it('uses the approved final-release movement, recruitment, dash, and passive tuning', () => {
    expect(GAME_CONFIG.playerMovement).toMatchObject({
      baseSpeed: 120,
      acceleration: 720,
      deceleration: 820,
      steeringResponsiveness: 1.2,
      speedBonusPerRecruitedUnit: 0.03,
      maximumSwarmSpeedBonus: 0.5,
    });
    expect(GAME_CONFIG.recruitment).toEqual({
      baseRadius: 55,
      radiusBonusPerUnit: 3,
      maximumRadiusBonus: 75,
    });
    expect(GAME_CONFIG.swarm).toMatchObject({
      cohesion: 0.46,
      separationRadius: 30,
      maxDistance: 170,
      offsetRadius: 38,
      arrivalRadius: 10,
      returnStrength: 2.8,
      idleSpeedMultiplier: 0.45,
    });
    expect(GAME_CONFIG.dash).toMatchObject({
      speedMultiplier: 1.9,
      durationMs: 220,
      accelerationInMs: 45,
      decelerationOutMs: 80,
      baseCooldownMs: 1200,
    });
    expect(GAME_CONFIG.factionPassives).toMatchObject({
      rock: {
        accelerationMultiplier: 0.9,
        outgoingKnockbackMultiplier: 1.25,
        incomingKnockbackMultiplier: 0.7,
      },
      paper: {
        accelerationMultiplier: 1.2,
        swarmSpreadMultiplier: 1.15,
      },
      scissors: {
        turnRateMultiplier: 1.25,
        dashCooldownMultiplier: 0.75,
        swarmResponseMultiplier: 1.1,
      },
    });
    expect(GAME_CONFIG.combat.baseKnockbackForce).toBeGreaterThan(125);
    expect(GAME_CONFIG.minimap).toMatchObject({
      dashBarHeight: 4,
      dashBarGap: 6,
      dashLabelGap: 2,
      dashLabelFontSize: 9,
    });
    expect(GAME_CONFIG.shrine).toMatchObject({
      enabled: true,
      activationRadius: 90,
      minimumRecruitedUnits: 4,
      channelDurationMs: 2000,
      channelMovementMultiplier: 0.2,
      sacrificeRatio: 0.2,
      postTransformPenaltyMs: 3000,
      postTransformMovementMultiplier: 0.65,
      usesPerMatch: 1,
    });
  });

  it('contains balanced positive combat values and integer populations', () => {
    expect(() => validateConfig(GAME_CONFIG)).not.toThrow();
    expect(GAME_CONFIG.combat.advantageDamage).toBeGreaterThan(
      GAME_CONFIG.combat.disadvantageDamage,
    );
    expect(Object.values(GAME_CONFIG.population).every(Number.isInteger)).toBe(true);
  });

  it('rejects unsafe values with useful errors', () => {
    expect(() =>
      validateConfig({ ...GAME_CONFIG, units: { ...GAME_CONFIG.units, maxHealth: 0 } }),
    ).toThrow(/maxHealth/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        combat: { ...GAME_CONFIG.combat, advantageDamage: 5, disadvantageDamage: 8 },
      }),
    ).toThrow(/advantageDamage/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        combat: { ...GAME_CONFIG.combat, disadvantageDamage: -1 },
      }),
    ).toThrow(/disadvantageDamage/);
    expect(() =>
      validateConfig({ ...GAME_CONFIG, camera: { ...GAME_CONFIG.camera, smoothing: 1.5 } }),
    ).toThrow(/camera.smoothing/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        particles: { ...GAME_CONFIG.particles, count: 2.5 },
      }),
    ).toThrow(/particles.count/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        trees: { ...GAME_CONFIG.trees, positions: [{ x: 0, y: 0 }] },
      }),
    ).toThrow(/trees.positions/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        units: {
          ...GAME_CONFIG.units,
          motion: { ...GAME_CONFIG.units.motion, maxTurnRate: 0 },
        },
      }),
    ).toThrow(/maxTurnRate/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        units: {
          ...GAME_CONFIG.units,
          motion: {
            ...GAME_CONFIG.units.motion,
            reactionDelayMs: GAME_CONFIG.units.motion.decisionIntervalMs + 1,
          },
        },
      }),
    ).toThrow(/reactionDelayMs/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        units: {
          ...GAME_CONFIG.units,
          motion: { ...GAME_CONFIG.units.motion, predictionError: -1 },
        },
      }),
    ).toThrow(/predictionError/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        minimap: { ...GAME_CONFIG.minimap, width: 0 },
      }),
    ).toThrow(/minimap.width/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        minimap: { ...GAME_CONFIG.minimap, neutralMarkerAlpha: Number.NaN },
      }),
    ).toThrow(/neutralMarkerAlpha/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        landmarks: { shrine: { x: GAME_CONFIG.world.width + 1, y: 0 } },
      }),
    ).toThrow(/landmarks.shrine/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        shrine: { ...GAME_CONFIG.shrine, sacrificeRatio: 1 },
      }),
    ).toThrow(/sacrificeRatio/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        shrine: { ...GAME_CONFIG.shrine, sacrificeRatio: 0.9 },
      }),
    ).toThrow(/survivor/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        shrine: { ...GAME_CONFIG.shrine, channelMovementMultiplier: 1.1 },
      }),
    ).toThrow(/channelMovementMultiplier/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        shrine: { ...GAME_CONFIG.shrine, effectParticleCount: 2.5 },
      }),
    ).toThrow(/effectParticleCount/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        playerMovement: {
          ...GAME_CONFIG.playerMovement,
          speedBonusPerRecruitedUnit: -0.1,
        },
      }),
    ).toThrow(/speedBonusPerRecruitedUnit/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        recruitment: { ...GAME_CONFIG.recruitment, radiusBonusPerUnit: -1 },
      }),
    ).toThrow(/radiusBonusPerUnit/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        factionPassives: {
          ...GAME_CONFIG.factionPassives,
          rock: {
            ...GAME_CONFIG.factionPassives.rock,
            incomingKnockbackMultiplier: 0,
          },
        },
      }),
    ).toThrow(/incomingKnockbackMultiplier/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        swarm: { ...GAME_CONFIG.swarm, idleSpeedMultiplier: 0 },
      }),
    ).toThrow(/idleSpeedMultiplier/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        dash: { ...GAME_CONFIG.dash, minimumInputMagnitude: 1.1 },
      }),
    ).toThrow(/minimumInputMagnitude/);
    expect(() =>
      validateConfig({
        ...GAME_CONFIG,
        dash: { ...GAME_CONFIG.dash, particleCount: 1.5 },
      }),
    ).toThrow(/particleCount/);
  });

  it('keeps the fixed meadow trees inside the playable boundary without overlap', () => {
    const minimum = GAME_CONFIG.world.padding + GAME_CONFIG.trees.radius;
    for (let index = 0; index < GAME_CONFIG.trees.positions.length; index += 1) {
      const tree = GAME_CONFIG.trees.positions[index]!;
      expect(tree.x).toBeGreaterThanOrEqual(minimum);
      expect(tree.y).toBeGreaterThanOrEqual(minimum);
      expect(tree.x).toBeLessThanOrEqual(GAME_CONFIG.world.width - minimum);
      expect(tree.y).toBeLessThanOrEqual(GAME_CONFIG.world.height - minimum);
      for (let other = index + 1; other < GAME_CONFIG.trees.positions.length; other += 1) {
        expect(distance(tree, GAME_CONFIG.trees.positions[other]!)).toBeGreaterThan(
          GAME_CONFIG.trees.radius * 2,
        );
      }
    }
  });
});

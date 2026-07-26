import type { DashConfig } from '../config/gameConfig';
import { DashSystem } from './dash';

const CONFIG: DashConfig = {
  enabled: true,
  speedMultiplier: 1.9,
  durationMs: 220,
  accelerationInMs: 45,
  decelerationOutMs: 80,
  baseCooldownMs: 1200,
  minimumInputMagnitude: 0.1,
  allowWhilePaused: false,
  cancelOnCollision: false,
  useLastDirection: true,
  particleCount: 5,
  particleLifetimeMs: 240,
  particleSpeed: 45,
};

describe('DashSystem', () => {
  it('starts only when ready, active, and supplied a valid direction', () => {
    const dash = new DashSystem(CONFIG);
    expect(dash.request({ x: 0, y: 0 }, true)).toBe(false);
    expect(dash.request({ x: 1, y: 0 }, false)).toBe(false);
    expect(dash.request({ x: 1, y: 0 }, true)).toBe(true);
    expect(dash.snapshot()).toMatchObject({
      phase: 'active',
      ready: false,
      direction: { x: 1, y: 0 },
      activeRemainingMs: CONFIG.durationMs,
    });
    expect(dash.request({ x: 1, y: 0 }, true)).toBe(false);
  });

  it('uses a normalized current direction and optionally remembers the last valid direction', () => {
    const dash = new DashSystem(CONFIG);
    dash.observeInput({ x: 0, y: 4 });
    expect(dash.request({ x: 0, y: 0 }, true)).toBe(true);
    expect(dash.snapshot().direction).toEqual({ x: 0, y: 1 });

    const forgetful = new DashSystem({ ...CONFIG, useLastDirection: false });
    forgetful.observeInput({ x: 1, y: 0 });
    expect(forgetful.request({ x: 0, y: 0 }, true)).toBe(false);
  });

  it('ends after its duration, enforces cooldown, and becomes reusable', () => {
    const dash = new DashSystem(CONFIG);
    dash.request({ x: 1, y: 0 }, true);
    dash.tick(CONFIG.durationMs - 1, true);
    expect(dash.snapshot().phase).toBe('active');
    dash.tick(1, true);
    expect(dash.snapshot()).toMatchObject({
      phase: 'cooldown',
      cooldownRemainingMs: CONFIG.baseCooldownMs,
    });
    expect(dash.request({ x: 1, y: 0 }, true)).toBe(false);
    dash.tick(CONFIG.baseCooldownMs, true);
    expect(dash.snapshot()).toMatchObject({ phase: 'ready', ready: true });
    expect(dash.request({ x: 1, y: 0 }, true)).toBe(true);
  });

  it('eases the speed multiplier in and out instead of snapping', () => {
    const dash = new DashSystem(CONFIG);
    dash.request({ x: 1, y: 0 }, true);
    expect(dash.movementMultiplier()).toBe(1);

    dash.tick(CONFIG.accelerationInMs / 2, true);
    expect(dash.movementMultiplier()).toBeGreaterThan(1);
    expect(dash.movementMultiplier()).toBeLessThan(CONFIG.speedMultiplier);

    dash.tick(CONFIG.accelerationInMs / 2, true);
    expect(dash.movementMultiplier()).toBeCloseTo(CONFIG.speedMultiplier);

    dash.tick(CONFIG.durationMs - CONFIG.accelerationInMs - CONFIG.decelerationOutMs / 2, true);
    expect(dash.movementMultiplier()).toBeGreaterThan(1);
    expect(dash.movementMultiplier()).toBeLessThan(CONFIG.speedMultiplier);
  });

  it('uses composable cooldown modifiers and rescales an active cooldown', () => {
    const dash = new DashSystem(CONFIG);
    dash.setCooldownModifiers({
      factionMultiplier: 0.75,
      difficultyMultiplier: 1,
      temporaryMultiplier: 1,
    });
    expect(dash.snapshot().cooldownMs).toBe(900);

    dash.request({ x: 1, y: 0 }, true);
    dash.tick(CONFIG.durationMs, true);
    dash.tick(300, true);
    expect(dash.snapshot().cooldownRemainingMs).toBe(600);

    dash.setCooldownModifiers({
      factionMultiplier: 1,
      difficultyMultiplier: 1,
      temporaryMultiplier: 1,
    });
    expect(dash.snapshot()).toMatchObject({
      cooldownMs: 1200,
      cooldownRemainingMs: 800,
    });
  });

  it('freezes consistently while paused and resets all transient state', () => {
    const dash = new DashSystem(CONFIG);
    dash.request({ x: 1, y: 0 }, true);
    dash.tick(60, true);
    const beforePause = dash.snapshot();
    dash.tick(500, false);
    expect(dash.snapshot()).toEqual(beforePause);
    dash.reset();
    expect(dash.snapshot()).toMatchObject({
      phase: 'ready',
      ready: true,
      activeRemainingMs: 0,
      cooldownRemainingMs: 0,
    });
  });

  it('honors disabled and cancel-on-collision configuration', () => {
    const disabled = new DashSystem({ ...CONFIG, enabled: false });
    expect(disabled.request({ x: 1, y: 0 }, true)).toBe(false);

    const cancellable = new DashSystem({ ...CONFIG, cancelOnCollision: true });
    cancellable.request({ x: 1, y: 0 }, true);
    cancellable.handleCollision();
    expect(cancellable.snapshot().phase).toBe('cooldown');

    const persistent = new DashSystem(CONFIG);
    persistent.request({ x: 1, y: 0 }, true);
    persistent.handleCollision();
    expect(persistent.snapshot().phase).toBe('active');
  });
});

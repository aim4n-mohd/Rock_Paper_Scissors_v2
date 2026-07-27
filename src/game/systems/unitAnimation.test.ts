import { createUnit } from '../model/unit';
import { UnitAnimationController } from './unitAnimation';

const normalContext = {
  dashActive: false,
  shrineTransformActive: false,
  reducedMotion: false,
};

describe('shared unit animation controller', () => {
  it('starts and stops movement animation', () => {
    const controller = new UnitAnimationController();
    const unit = createUnit('rock', 'rock', { x: 0, y: 0 });

    expect(controller.update(unit, normalContext, 16).state).toBe('idle');
    unit.velocity.x = 70;
    expect(controller.update(unit, normalContext, 80).state).toBe('move');
    unit.velocity.x = 0;
    expect(controller.update(unit, normalContext, 16).state).toBe('idle');
  });

  it('uses dash, hit, death, and shrine transformation states with correct recovery', () => {
    const controller = new UnitAnimationController();
    const unit = createUnit('paper', 'paper', { x: 0, y: 0 }, true);
    unit.velocity.x = 80;

    expect(controller.update(unit, { ...normalContext, dashActive: true }, 16).state).toBe('dash');
    unit.flashRemainingMs = 100;
    expect(controller.update(unit, normalContext, 16).state).toBe('hit');
    unit.flashRemainingMs = 0;
    expect(controller.update(unit, normalContext, 16).state).toBe('move');
    expect(
      controller.update(unit, { ...normalContext, shrineTransformActive: true }, 16).state,
    ).toBe('shrine');
    unit.alive = false;
    unit.deathTransitionRemainingMs = 200;
    expect(controller.update(unit, normalContext, 16).state).toBe('death');
  });

  it('makes Rock roll speed respond to velocity', () => {
    const controller = new UnitAnimationController();
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    rock.velocity.x = 20;
    const slow = controller.update(rock, normalContext, 16);
    rock.velocity.x = 140;
    const fast = controller.update(rock, normalContext, 16);

    expect(fast.playbackRate).toBeGreaterThan(slow.playbackRate);
    expect(fast.playbackRate).toBeLessThanOrEqual(1.4);
    expect(fast.rotation).not.toBe(slow.rotation);
    expect(Math.abs(fast.rotation - slow.rotation)).toBeLessThan(0.15);
  });

  it('points Scissors along velocity and cycles blade frames at a readable pace', () => {
    const controller = new UnitAnimationController();
    const scissors = createUnit('scissors', 'scissors', { x: 0, y: 0 });
    scissors.velocity = { x: 0, y: 100 };
    const first = controller.update(scissors, normalContext, 16);
    const second = controller.update(scissors, normalContext, 70);
    const third = controller.update(scissors, normalContext, 100);

    expect(first.rotation).toBeCloseTo(Math.PI / 2);
    expect(second.frame.id).toBe(first.frame.id);
    expect(third.frame.id).not.toBe(first.frame.id);
    expect(third.playbackRate).toBeLessThanOrEqual(1.4);
  });

  it('uses Paper flutter frames and suppresses nonessential cycling in reduced motion', () => {
    const controller = new UnitAnimationController();
    const paper = createUnit('paper', 'paper', { x: 0, y: 0 });
    paper.velocity.x = 90;
    const moving = controller.update(paper, normalContext, 140);
    const reduced = controller.update(paper, { ...normalContext, reducedMotion: true }, 500);

    expect(moving.frame.id).toContain('paper-flutter');
    expect(reduced.frameIndex).toBe(0);
  });

  it('cleans stale runtimes and reset does not duplicate animation state', () => {
    const controller = new UnitAnimationController();
    const rock = createUnit('rock', 'rock', { x: 0, y: 0 });
    controller.update(rock, normalContext, 16);
    controller.cleanup(new Set());
    expect(controller.runtimeCount).toBe(0);
    controller.update(rock, normalContext, 16);
    controller.reset();
    expect(controller.runtimeCount).toBe(0);
  });
});

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Faction } from '../game/config/factions';
import {
  TutorialController,
  type TutorialSnapshot,
  type TutorialStage,
} from '../game/tutorial/tutorial';

const STAGE_COPY: Record<TutorialStage, { title: string; instruction: string }> = {
  move: { title: 'Movement', instruction: 'Move with WASD or the arrow keys.' },
  recruit: { title: 'Build your swarm', instruction: 'Move close and recruit the Rock ally.' },
  prey: { title: 'Hunt your prey', instruction: 'Approach Scissors and land an advantage hit.' },
  predator: {
    title: 'Escape your predator',
    instruction: 'Paper hunts Rock. Create distance before it reaches you.',
  },
  dash: { title: 'Dash', instruction: 'Press Space for a smooth burst of speed.' },
  shrine: { title: 'The Triad Shrine', instruction: 'Enter the glowing shrine ring.' },
  switch: { title: 'Become what hunts you', instruction: 'Choose Paper or Scissors to transform.' },
  complete: { title: 'Cycle mastered', instruction: 'You are ready for the arena.' },
};

function drawTutorial(canvas: HTMLCanvasElement, snapshot: TutorialSnapshot): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#678b4c';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(18,38,24,.18)';
  for (let x = 35; x < canvas.width; x += 70) context.fillRect(x, 0, 2, canvas.height);
  context.strokeStyle = '#f3cf68';
  context.lineWidth = 5;
  context.beginPath();
  context.arc(snapshot.shrine.x, snapshot.shrine.y, 58, 0, Math.PI * 2);
  context.stroke();
  const colors: Record<Faction, string> = {
    rock: '#8aa0a8',
    paper: '#f3e7bf',
    scissors: '#d95555',
  };
  for (const entity of snapshot.entities) {
    if (!entity.visible) continue;
    context.fillStyle = 'rgba(10,20,13,.25)';
    context.beginPath();
    context.ellipse(entity.position.x, entity.position.y + 11, 18, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colors[entity.faction];
    context.beginPath();
    context.arc(
      entity.position.x,
      entity.position.y,
      entity.role === 'player' ? 15 : 12,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

export function TutorialExperience({ onComplete, onSkip }: { onComplete(): void; onSkip(): void }) {
  const controller = useRef(new TutorialController());
  const canvas = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState(() => controller.current.snapshot());
  const current = STAGE_COPY[snapshot.stage];

  const refresh = useCallback(() => setSnapshot(controller.current.snapshot()), []);

  useEffect(() => {
    if (canvas.current) drawTutorial(canvas.current, snapshot);
    if (snapshot.stage === 'complete') {
      const timer = window.setTimeout(onComplete, 650);
      return () => window.clearTimeout(timer);
    }
  }, [onComplete, snapshot]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const directions: Record<string, { x: number; y: number }> = {
        w: { x: 0, y: -1 },
        arrowup: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        arrowdown: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        arrowleft: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
        arrowright: { x: 1, y: 0 },
      };
      if (directions[key]) {
        event.preventDefault();
        controller.current.update(1000, directions[key]!);
        refresh();
      } else if (event.code === 'Space' && snapshot.stage === 'dash') {
        event.preventDefault();
        controller.current.requestDash();
        refresh();
      }
    };
    window.addEventListener('keydown', keyDown);
    return () => window.removeEventListener('keydown', keyDown);
  }, [refresh, snapshot.stage]);

  return (
    <section
      className="tutorial-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <header>
        <div>
          <p className="eyebrow">
            Tutorial ·{' '}
            {Math.min(
              8,
              [
                'move',
                'recruit',
                'prey',
                'predator',
                'dash',
                'shrine',
                'switch',
                'complete',
              ].indexOf(snapshot.stage) + 1,
            )}{' '}
            / 8
          </p>
          <h2 id="tutorial-title">{current.title}</h2>
          <p>{current.instruction}</p>
        </div>
        <button type="button" className="text-button" onClick={onSkip}>
          Skip
        </button>
      </header>
      <canvas ref={canvas} width={800} height={450} aria-label="Deterministic tutorial arena" />
      <div className="tutorial-action">
        {snapshot.stage === 'move' && <span>Press a movement key</span>}
        {snapshot.stage === 'recruit' && <span>Move into the nearby Rock ally</span>}
        {snapshot.stage === 'prey' && <span>Move into Scissors to attack with advantage</span>}
        {snapshot.stage === 'predator' && <span>Keep moving until Paper falls behind</span>}
        {snapshot.stage === 'dash' && (
          <button
            type="button"
            onClick={() => {
              controller.current.requestDash();
              refresh();
            }}
          >
            Dash with Space
          </button>
        )}
        {snapshot.stage === 'shrine' && <span>Move inside the gold shrine ring</span>}
        {snapshot.stage === 'switch' && (
          <div role="group" aria-label="Tutorial faction choice">
            <button
              type="button"
              onClick={() => {
                controller.current.selectFaction('paper');
                refresh();
              }}
            >
              Choose Paper
            </button>
            <button
              type="button"
              onClick={() => {
                controller.current.selectFaction('scissors');
                refresh();
              }}
            >
              Choose Scissors
            </button>
          </div>
        )}
        {snapshot.stage === 'complete' && <strong>Tutorial complete</strong>}
      </div>
    </section>
  );
}

import { useEffect, useRef } from 'react';
import { FACTION_COLORS } from '../game/config/factionVisuals';
import { Simulation } from '../game/simulation/Simulation';
import { createLandingSimulation } from './landingSimulation';

function draw(
  context: CanvasRenderingContext2D,
  simulation: Simulation,
  width: number,
  height: number,
): void {
  const scaleX = width / simulation.map.world.width;
  const scaleY = height / simulation.map.world.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#233c28';
  context.fillRect(0, 0, width, height);
  for (const unit of simulation.units) {
    if (!unit.alive) continue;
    context.fillStyle = `#${FACTION_COLORS[unit.faction].toString(16).padStart(6, '0')}`;
    context.beginPath();
    context.arc(unit.position.x * scaleX, unit.position.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
  }
}

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas) return;
    let simulation = createLandingSimulation();
    let frame = 0;
    let previous = performance.now();
    const render = (now: number) => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width || 960));
      canvas.height = Math.max(1, Math.round(rect.height || 540));
      if (!document.hidden) {
        simulation.update(Math.min(34, now - previous), { x: 0, y: 0 }, false);
        if (simulation.status !== 'active') simulation = createLandingSimulation();
        if (context) draw(context, simulation, canvas.width, canvas.height);
      }
      previous = now;
      frame = requestAnimationFrame(render);
    };
    const visibility = () => {
      previous = performance.now();
    };
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="landing-background"
      data-testid="landing-background"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    />
  );
}

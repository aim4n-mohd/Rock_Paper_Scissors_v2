import { act, render } from '@testing-library/react';
import { LandingBackground } from './LandingBackground';
import { createLandingSimulation } from './landingSimulation';

describe('landing background simulation', () => {
  it('uses a deterministic reduced, non-player-controlled population', () => {
    const first = createLandingSimulation();
    const second = createLandingSimulation();
    expect(first.units.map((unit) => [unit.id, unit.faction, unit.position])).toEqual(
      second.units.map((unit) => [unit.id, unit.faction, unit.position]),
    );
    expect(first.units.filter((unit) => unit.alive)).toHaveLength(12);
    expect(first.units.every((unit) => !unit.recruited)).toBe(true);
  });

  it('pauses while hidden and cleans up its animation and visibility listener', () => {
    const request = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const remove = vi.spyOn(document, 'removeEventListener');
    const { unmount, getByTestId } = render(<LandingBackground />);

    expect(getByTestId('landing-background')).toHaveAttribute('aria-hidden', 'true');
    expect(getByTestId('landing-background')).toHaveStyle({ pointerEvents: 'none' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
    expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    request.mockRestore();
    cancel.mockRestore();
    remove.mockRestore();
  });
});

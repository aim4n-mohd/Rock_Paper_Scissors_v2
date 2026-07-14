import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gameBridge } from './game/events/gameBridge';
import { App } from './App';

vi.mock('./game/GameCanvas', () => ({
  GameCanvas: ({ onError }: { onError?: (message: string) => void }) => (
    <>
      <div data-testid="phaser-game" />
      <button type="button" onClick={() => onError?.('Renderer failed')}>
        Simulate game failure
      </button>
    </>
  ),
}));

describe('application shell', () => {
  afterEach(() => gameBridge.reset());

  it('renders the game title and start action', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /rock, paper, scissors v2\.2/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /start game/i })).toBeEnabled();
  });

  it('starts the match, renders the HUD, and reflects pause state', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start game/i }));
    expect(screen.getByTestId('phaser-game')).toBeVisible();
    expect(screen.getByText(/rocks/i)).toHaveTextContent('15');
    act(() =>
      gameBridge.publish({
        status: 'paused',
        counts: { rock: 14, paper: 11, scissors: 15 },
        elapsedMs: 1200,
        recruitedCount: 3,
        swarmCenter: { x: 100, y: 100 },
      }),
    );
    expect(screen.getByRole('heading', { name: /paused/i })).toBeVisible();
  });

  it('shows a recoverable error when the game renderer cannot start', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start game/i }));
    await userEvent.click(screen.getByRole('button', { name: /simulate game failure/i }));
    expect(screen.getByRole('heading', { name: /game could not start/i })).toBeVisible();
    expect(screen.getByText(/renderer failed/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /try again/i })).toBeEnabled();
  });

  it('clears held movement on blur and ignores repeated pause and restart keydown events', async () => {
    const togglePause = vi.fn();
    const restart = vi.fn();
    gameBridge.bindController({ togglePause, restart, killFaction: vi.fn() });
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start game/i }));

    fireEvent.keyDown(window, { key: 'd' });
    expect(gameBridge.input).toEqual({ x: 1, y: 0 });
    fireEvent.blur(window);
    expect(gameBridge.input).toEqual({ x: 0, y: 0 });

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'Escape', repeat: true });
    fireEvent.keyDown(window, { key: 'r' });
    fireEvent.keyDown(window, { key: 'r', repeat: true });
    expect(togglePause).toHaveBeenCalledOnce();
    expect(restart).toHaveBeenCalledOnce();
  });
});

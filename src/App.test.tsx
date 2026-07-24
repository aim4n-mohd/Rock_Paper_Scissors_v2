import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gameBridge } from './game/events/gameBridge';
import { App } from './App';

const SHRINE_SNAPSHOT = {
  status: 'available' as const,
  channelProgressMs: 0,
  channelDurationMs: 2000,
  usesRemaining: 1,
  movementPenaltyRemainingMs: 0,
  transformationEffectRemainingMs: 0,
  inRange: false,
  canActivate: false,
  sacrificePreview: 1,
  minimumRecruitedUnits: 4,
};

const DASH_SNAPSHOT = {
  phase: 'ready' as const,
  ready: true,
  direction: { x: 0, y: 0 },
  activeRemainingMs: 0,
  cooldownRemainingMs: 0,
  cooldownMs: 2400,
};

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
        playerFaction: 'rock',
        counts: { rock: 14, paper: 11, scissors: 15 },
        elapsedMs: 1200,
        recruitedCount: 3,
        swarmCenter: { x: 100, y: 100 },
        shrine: SHRINE_SNAPSHOT,
        dash: DASH_SNAPSHOT,
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
    const cycleShrineSelection = vi.fn();
    const requestDash = vi.fn();
    gameBridge.bindController({
      togglePause,
      restart,
      killFaction: vi.fn(),
      cycleShrineSelection,
      requestDash,
    });
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
    fireEvent.keyDown(window, { key: 'e' });
    fireEvent.keyDown(window, { key: 'q' });
    expect(cycleShrineSelection).toHaveBeenNthCalledWith(1, 1);
    expect(cycleShrineSelection).toHaveBeenNthCalledWith(2, -1);
    fireEvent.keyDown(window, { key: 'f' });
    expect(gameBridge.interactionHeld).toBe(true);
    fireEvent.keyUp(window, { key: 'f' });
    expect(gameBridge.interactionHeld).toBe(false);

    fireEvent.keyDown(window, { key: 'd' });
    expect(fireEvent.keyDown(window, { key: ' ', code: 'Space' })).toBe(false);
    fireEvent.keyDown(window, { key: ' ', code: 'Space', repeat: true });
    expect(requestDash).toHaveBeenCalledOnce();
    fireEvent.keyUp(window, { key: ' ', code: 'Space' });
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(requestDash).toHaveBeenCalledTimes(2);
  });

  it('keeps the top HUD focused on counts and time while showing shrine feedback', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /start game/i }));
    act(() =>
      gameBridge.publish({
        status: 'active',
        playerFaction: 'paper',
        counts: { rock: 4, paper: 8, scissors: 6 },
        elapsedMs: 1000,
        recruitedCount: 5,
        swarmCenter: { x: 1440, y: 810 },
        shrine: {
          ...SHRINE_SNAPSHOT,
          status: 'channeling',
          selectedFaction: 'scissors',
          channelProgressMs: 1000,
          inRange: true,
          canActivate: true,
        },
        dash: {
          ...DASH_SNAPSHOT,
          phase: 'cooldown',
          ready: false,
          cooldownRemainingMs: 650,
        },
      }),
    );

    expect(screen.getByLabelText(/match status/i)).not.toHaveTextContent(/swarm/i);
    expect(screen.queryByLabelText(/dash status/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/triad shrine/i)).toHaveTextContent('Selected Scissors');
    expect(screen.getByLabelText(/triad shrine/i)).toHaveTextContent('Sacrifice 1 of 5');
    expect(screen.getByRole('progressbar', { name: /shrine channel/i })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });

  it('does not consume or dispatch Space before active gameplay starts', () => {
    const requestDash = vi.fn();
    gameBridge.bindController({
      togglePause: vi.fn(),
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      requestDash,
    });
    render(<App />);

    expect(fireEvent.keyDown(window, { key: ' ', code: 'Space' })).toBe(true);
    expect(requestDash).not.toHaveBeenCalled();
  });
});

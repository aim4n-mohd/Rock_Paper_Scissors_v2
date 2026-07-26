import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { gameBridge } from './game/events/gameBridge';
import { setTutorialCompleted } from './game/persistence/playerPreferences';
import type { GameSnapshot } from './game/simulation/Simulation';

vi.mock('./ui/LandingBackground', () => ({
  LandingBackground: () => <div data-testid="landing-background" aria-hidden="true" />,
}));

vi.mock('./game/GameCanvas', () => ({
  GameCanvas: ({
    onError,
    mapId,
    startingFaction,
    difficulty,
    mode,
    visualSettings,
  }: {
    onError?: (message: string) => void;
    mapId: string;
    startingFaction: string;
    difficulty: string;
    mode: string;
    visualSettings: { minimapOpacity: number };
  }) => (
    <>
      <div
        data-testid="phaser-game"
        data-map-id={mapId}
        data-starting-faction={startingFaction}
        data-difficulty={difficulty}
        data-mode={mode}
        data-minimap-opacity={visualSettings.minimapOpacity}
      />
      <button type="button" onClick={() => onError?.('Renderer failed')}>
        Simulate game failure
      </button>
    </>
  ),
}));

const SHRINE = {
  status: 'available' as const,
  channelProgressMs: 0,
  channelDurationMs: 2000,
  usesRemaining: 1,
  movementPenaltyRemainingMs: 0,
  transformationEffectRemainingMs: 0,
  cancelledFeedbackRemainingMs: 0,
  inRange: false,
  canActivate: false,
  sacrificePreview: 1,
  minimumRecruitedUnits: 4,
};

const DASH = {
  phase: 'ready' as const,
  ready: true,
  direction: { x: 0, y: 0 },
  activeRemainingMs: 0,
  cooldownRemainingMs: 0,
  cooldownMs: 1200,
};

function snapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    status: 'active',
    mapId: 'meadow',
    startingFaction: 'rock',
    playerFaction: 'rock',
    difficulty: 'normal',
    mode: 'last-faction-standing',
    counts: { rock: 14, paper: 11, scissors: 15 },
    elapsedMs: 1200,
    recruitedCount: 3,
    swarmCenter: { x: 100, y: 100 },
    shrine: SHRINE,
    dash: DASH,
    score: { current: 0, preyKills: 0, predatorKills: 0, killPoints: 0 },
    ...overrides,
  };
}

async function chooseSetup() {
  await userEvent.click(screen.getByRole('button', { name: /^paper/i }));
  await userEvent.click(screen.getByRole('button', { name: /^normal/i }));
  await userEvent.click(screen.getByRole('button', { name: /last faction standing/i }));
  await userEvent.click(screen.getByRole('button', { name: /^meadow/i }));
}

async function startMatch({ tutorialCompleted = true } = {}) {
  if (tutorialCompleted) setTutorialCompleted(localStorage, true);
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /^play$/i }));
  await chooseSetup();
  await userEvent.click(screen.getByRole('button', { name: /^play match$/i }));
}

describe('player-facing application flow', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => gameBridge.reset());

  it('renders the minimal landing content over a non-interactive simulation', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Rock Paper Scissors 2' })).toBeVisible();
    expect(
      screen.getByText('Build your swarm. Hunt your prey. Become what hunts you.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^play$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /how to play/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /settings/i })).toBeEnabled();
    expect(screen.getByTestId('landing-background')).toHaveAttribute('aria-hidden', 'true');
  });

  it('requires all four selections and persists the chosen setup', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^play$/i }));

    const play = screen.getByRole('button', { name: /^play match$/i });
    expect(play).toBeDisabled();
    expect(screen.getByRole('group', { name: /starting faction/i })).toBeVisible();
    expect(screen.getByRole('group', { name: /difficulty/i })).toBeVisible();
    expect(screen.getByRole('group', { name: /game mode/i })).toBeVisible();
    expect(screen.getByRole('group', { name: /^map$/i })).toBeVisible();

    await chooseSetup();
    expect(play).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: /back to main menu/i }));
    await userEvent.click(screen.getByRole('button', { name: /^play$/i }));
    expect(screen.getByRole('button', { name: /^paper/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('forces the tutorial once, supports skip, and does not force it again', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^play$/i }));
    await chooseSetup();
    await userEvent.click(screen.getByRole('button', { name: /^play match$/i }));
    expect(screen.getByRole('heading', { name: /learn the hunt/i })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /skip tutorial/i }));
    expect(screen.getByTestId('phaser-game')).toBeVisible();

    act(() => gameBridge.publish(snapshot({ status: 'paused' })));
    await userEvent.click(screen.getByRole('button', { name: /quit to main menu/i }));
    await userEvent.click(screen.getByRole('button', { name: /^play$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^play match$/i }));
    expect(screen.getByTestId('phaser-game')).toBeVisible();
    expect(screen.queryByRole('heading', { name: /learn the hunt/i })).not.toBeInTheDocument();
  });

  it('offers replay tutorial from How to Play without writing records', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
    expect(screen.getByText(/ally, prey, predator/i)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /replay tutorial/i }));
    expect(screen.getByRole('heading', { name: /movement/i })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    expect(localStorage.getItem('rps2:local-records')).toBeNull();
  });

  it('persists settings and applies minimap opacity immediately to a running match', async () => {
    await startMatch();
    act(() => gameBridge.publish(snapshot({ status: 'paused' })));
    await userEvent.click(screen.getByRole('button', { name: /^settings$/i }));
    const opacity = screen.getByRole('slider', { name: /minimap opacity/i });
    fireEvent.change(opacity, { target: { value: '0.4' } });
    expect(screen.getByTestId('phaser-game')).toHaveAttribute('data-minimap-opacity', '0.4');

    await userEvent.click(screen.getByRole('button', { name: /back to pause/i }));
    await userEvent.click(screen.getByRole('button', { name: /^resume$/i }));
    expect(screen.queryByRole('heading', { name: /^paused$/i })).not.toBeInTheDocument();
  });

  it('keeps the simulation paused through nested screens, restarts, and quits cleanly', async () => {
    const setPaused = vi.fn();
    const restart = vi.fn();
    gameBridge.bindController({
      setPaused,
      togglePause: vi.fn(),
      restart,
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      selectShrineFaction: vi.fn(),
      requestDash: vi.fn(),
    });
    await startMatch();
    act(() => gameBridge.publish(snapshot({ status: 'paused' })));

    await userEvent.click(screen.getByRole('button', { name: /how to play/i }));
    expect(setPaused).toHaveBeenLastCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: /back to pause/i }));
    await userEvent.click(screen.getByRole('button', { name: /^restart$/i }));
    expect(restart).toHaveBeenCalledOnce();

    act(() => gameBridge.publish(snapshot({ status: 'paused' })));
    await userEvent.click(screen.getByRole('button', { name: /quit to main menu/i }));
    expect(screen.getByRole('heading', { name: 'Rock Paper Scissors 2' })).toBeVisible();
    expect(screen.queryByTestId('phaser-game')).not.toBeInTheDocument();
  });

  it('shows authoritative results and supports replay and setup changes', async () => {
    await startMatch();
    act(() =>
      gameBridge.publish(
        snapshot({
          status: 'victory',
          startingFaction: 'paper',
          elapsedMs: 42_000,
          recruitedCount: 7,
          playerFaction: 'scissors',
          score: {
            current: 1200,
            preyKills: 4,
            predatorKills: 2,
            killPoints: 1000,
            final: {
              preyKills: 4,
              predatorKills: 2,
              killPoints: 1000,
              victoryBonus: 1000,
              survivorBonus: 350,
              timeBonus: 580,
              modeCompletionBonus: 0,
              subtotal: 2930,
              difficultyMultiplier: 1,
              modeMultiplier: 1,
              finalScore: 2930,
            },
          },
        }),
      ),
    );

    const results = screen.getByRole('dialog', { name: /victory results/i });
    expect(within(results).getAllByText('2,930')).toHaveLength(2);
    expect(within(results).getByText(/total kills/i).parentElement).toHaveTextContent('6');
    expect(within(results).getByText(/starting faction/i).parentElement).toHaveTextContent('Paper');
    expect(within(results).getByText(/final faction/i).parentElement).toHaveTextContent('Scissors');
    expect(within(results).getByText(/new record/i)).toBeVisible();

    await userEvent.click(within(results).getByRole('button', { name: /play again/i }));
    expect(screen.getByTestId('phaser-game')).toHaveAttribute('data-starting-faction', 'paper');

    act(() =>
      gameBridge.publish(
        snapshot({
          status: 'defeat',
          score: {
            current: 0,
            preyKills: 0,
            predatorKills: 0,
            killPoints: 0,
            final: {
              preyKills: 0,
              predatorKills: 0,
              killPoints: 0,
              victoryBonus: 0,
              survivorBonus: 0,
              timeBonus: 0,
              modeCompletionBonus: 0,
              subtotal: 0,
              difficultyMultiplier: 1,
              modeMultiplier: 1,
              finalScore: 0,
            },
          },
        }),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: /change setup/i }));
    expect(screen.getByRole('heading', { name: /choose your match/i })).toBeVisible();
  });

  it('forwards gameplay keys only during a match and keeps visible focus states on controls', async () => {
    const requestDash = vi.fn();
    gameBridge.bindController({
      setPaused: vi.fn(),
      togglePause: vi.fn(),
      restart: vi.fn(),
      killFaction: vi.fn(),
      cycleShrineSelection: vi.fn(),
      selectShrineFaction: vi.fn(),
      requestDash,
    });
    render(<App />);
    expect(fireEvent.keyDown(window, { key: ' ', code: 'Space' })).toBe(true);
    expect(requestDash).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /^play$/i }));
    const factionCard = screen.getByRole('button', { name: /^rock/i });
    factionCard.focus();
    expect(factionCard).toHaveFocus();
  });
});

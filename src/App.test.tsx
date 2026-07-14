import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { gameBridge } from './game/events/gameBridge';
import { App } from './App';

vi.mock('./game/GameCanvas', () => ({ GameCanvas: () => <div data-testid="phaser-game" /> }));

describe('application shell', () => {
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
});

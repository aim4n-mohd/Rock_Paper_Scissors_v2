import { render, waitFor } from '@testing-library/react';
import { GameCanvas } from './GameCanvas';

describe('GameCanvas lifecycle', () => {
  it('destroys an injected game instance on unmount', async () => {
    const destroy = vi.fn();
    const gameFactory = vi.fn(async () => ({ destroy }));
    const { unmount } = render(<GameCanvas gameFactory={gameFactory} onError={vi.fn()} />);
    await waitFor(() => expect(gameFactory).toHaveBeenCalledOnce());
    unmount();
    expect(destroy).toHaveBeenCalledWith(true);
  });

  it('reports initialization failures to the application shell', async () => {
    const onError = vi.fn();
    const gameFactory = vi.fn(async () => {
      throw new Error('WebGL unavailable');
    });
    render(<GameCanvas gameFactory={gameFactory} onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalledWith('WebGL unavailable'));
  });
});

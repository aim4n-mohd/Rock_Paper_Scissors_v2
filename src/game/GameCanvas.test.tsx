import { render, waitFor } from '@testing-library/react';
import { GameCanvas } from './GameCanvas';
import { gameBridge } from './events/gameBridge';

describe('GameCanvas lifecycle', () => {
  it('aborts an unfinished game startup when the effect is disposed', async () => {
    let startupSignal: AbortSignal | undefined;
    const gameFactory = vi.fn(async (_parent: HTMLElement, signal: AbortSignal) => {
      startupSignal = signal;
      return undefined;
    });
    const { unmount } = render(<GameCanvas gameFactory={gameFactory} />);
    await waitFor(() => expect(gameFactory).toHaveBeenCalledOnce());
    unmount();
    expect(startupSignal?.aborted).toBe(true);
  });

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

  it('destroys the previous game before loading a different selected map', async () => {
    const firstDestroy = vi.fn();
    const secondDestroy = vi.fn();
    const gameFactory = vi
      .fn()
      .mockResolvedValueOnce({ destroy: firstDestroy })
      .mockResolvedValueOnce({ destroy: secondDestroy });
    const { rerender } = render(<GameCanvas mapId="meadow" gameFactory={gameFactory} />);
    await waitFor(() => expect(gameFactory).toHaveBeenCalledOnce());

    rerender(<GameCanvas mapId="forest" gameFactory={gameFactory} />);

    await waitFor(() => expect(gameFactory).toHaveBeenCalledTimes(2));
    expect(firstDestroy).toHaveBeenCalledWith(true);
    expect(gameFactory.mock.calls[1]?.[2]).toBe('forest');
  });

  it('applies changed visual settings without destroying the active match', async () => {
    const destroy = vi.fn();
    const gameFactory = vi.fn(async () => ({ destroy }));
    const applyVisualSettings = vi.spyOn(gameBridge, 'applyVisualSettings');
    const { rerender } = render(
      <GameCanvas gameFactory={gameFactory} visualSettings={{ minimapOpacity: 1 }} />,
    );
    await waitFor(() => expect(gameFactory).toHaveBeenCalledOnce());

    rerender(<GameCanvas gameFactory={gameFactory} visualSettings={{ minimapOpacity: 0.4 }} />);

    expect(gameFactory).toHaveBeenCalledOnce();
    expect(destroy).not.toHaveBeenCalled();
    expect(applyVisualSettings).toHaveBeenLastCalledWith({ minimapOpacity: 0.4 });
    applyVisualSettings.mockRestore();
  });
});

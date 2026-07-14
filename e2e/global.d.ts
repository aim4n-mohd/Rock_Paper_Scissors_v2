interface Window {
  __RPS_TEST__?: {
    snapshot: () =>
      | {
          counts: { rock: number; paper: number; scissors: number };
          elapsedMs: number;
          swarmCenter: { x: number; y: number };
        }
      | undefined;
    killFaction: (faction: 'rock' | 'paper' | 'scissors') => void;
    restart: () => void;
  };
}

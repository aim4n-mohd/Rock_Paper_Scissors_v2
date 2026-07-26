export function HowToPlay({
  returnLabel,
  onClose,
  onReplayTutorial,
}: {
  returnLabel: string;
  onClose(): void;
  onReplayTutorial(): void;
}) {
  const topics = [
    [
      '△',
      'Ally, prey, predator',
      'Your faction recruits allies, hunts its prey, and escapes its predator.',
    ],
    [
      '◎',
      'Recruitment',
      'Move close to independent units of your faction to add them to your swarm.',
    ],
    ['↗', 'Movement', 'Use WASD or the arrow keys. Your swarm follows your lead.'],
    ['➤', 'Dash', 'Press Space for a short burst. Faction and difficulty affect recovery.'],
    [
      '⚔',
      'Combat advantage',
      'Prey takes stronger damage and knockback. Predator attacks are dangerous.',
    ],
    [
      '◇',
      'Shrine switching',
      'At four recruits, choose another faction and hold F. The shrine sacrifices part of your swarm.',
    ],
    [
      '★',
      'Victory and defeat',
      'Eliminate both rival factions. Lose when your player-faction swarm is gone.',
    ],
    ['▣', 'Minimap', 'Track faction groups, the shrine, your camera, and dash cooldown.'],
  ];
  return (
    <section className="panel-screen" role="dialog" aria-modal="true" aria-labelledby="how-title">
      <p className="eyebrow">Know the cycle</p>
      <h2 id="how-title">How to Play</h2>
      <div className="how-grid">
        {topics.map(([icon, title, copy]) => (
          <article key={title}>
            <span className="topic-icon" aria-hidden="true">
              {icon}
            </span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="menu-actions">
        <button type="button" className="secondary" onClick={onReplayTutorial}>
          Replay Tutorial
        </button>
        <button type="button" className="primary" onClick={onClose}>
          {returnLabel}
        </button>
      </div>
    </section>
  );
}

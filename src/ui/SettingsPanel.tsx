import type { PlayerSettings } from '../game/persistence/playerPreferences';

function RangeSetting({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange(value: number): void;
}) {
  return (
    <label className="setting-row">
      <span>
        {label}
        <output>{Math.round(value * 100)}%</output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function SettingsPanel({
  settings,
  returnLabel,
  onChange,
  onClose,
  onFullscreen,
}: {
  settings: PlayerSettings;
  returnLabel: string;
  onChange(settings: PlayerSettings): void;
  onClose(): void;
  onFullscreen(): void;
}) {
  const update = <Key extends keyof PlayerSettings>(key: Key, value: PlayerSettings[Key]) =>
    onChange({ ...settings, [key]: value });
  return (
    <section
      className="panel-screen settings-screen"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <p className="eyebrow">Make it yours</p>
      <h2 id="settings-title">Settings</h2>
      <div className="settings-grid">
        <RangeSetting
          label="Master volume"
          value={settings.masterVolume}
          onChange={(value) => update('masterVolume', value)}
        />
        <RangeSetting
          label="Music volume"
          value={settings.musicVolume}
          onChange={(value) => update('musicVolume', value)}
        />
        <RangeSetting
          label="Sound-effect volume"
          value={settings.soundEffectsVolume}
          onChange={(value) => update('soundEffectsVolume', value)}
        />
        <RangeSetting
          label="Particle intensity"
          value={settings.particleIntensity}
          max={2}
          step={0.25}
          onChange={(value) => update('particleIntensity', value)}
        />
        <RangeSetting
          label="Minimap opacity"
          value={settings.minimapOpacity}
          onChange={(value) => update('minimapOpacity', value)}
        />
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={settings.screenShake}
            onChange={(event) => update('screenShake', event.target.checked)}
          />{' '}
          Screen shake
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => update('reducedMotion', event.target.checked)}
          />{' '}
          Reduced motion
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={settings.reducedFlashes}
            onChange={(event) => update('reducedFlashes', event.target.checked)}
          />{' '}
          Reduced flashes
        </label>
        <button type="button" className="setting-toggle fullscreen-button" onClick={onFullscreen}>
          {settings.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        </button>
      </div>
      <div className="controls-reference">
        <h3>Controls</h3>
        <p>
          Move: WASD / arrows · Dash: Space · Shrine choice: Q / E · Channel: hold F · Pause: Esc
        </p>
      </div>
      <button type="button" className="primary" onClick={onClose}>
        {returnLabel}
      </button>
    </section>
  );
}

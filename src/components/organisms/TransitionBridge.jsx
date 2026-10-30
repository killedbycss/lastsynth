export function TransitionBridge({
  intensity,
  audioReady,
  onIntensityChange,
  onBuriedSwell,
  onDropToSilence,
}) {
  const percentage = Math.round(intensity * 100)

  return (
    <section className="ls-transition-bridge" style={{ '--ls-transition-level': `${percentage}%` }}>
      <div className="ls-transition-bridge__heading">
        <h2 className="ls-transition-bridge__title">Transition &amp; dynamics</h2>
        <span className="ls-transition-bridge__mode">
          {percentage < 35 ? 'Intro / verse' : percentage < 75 ? 'Building' : 'Catharsis'}
        </span>
      </div>

      <label className="ls-transition-bridge__swell">
        <span className="ls-transition-bridge__label">Catharsis swell</span>
        <span className="ls-transition-bridge__track" aria-hidden="true">
          <span className="ls-transition-bridge__fill" />
        </span>
        <input
          className="ls-transition-bridge__input"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={intensity}
          disabled={!audioReady}
          aria-label="Catharsis swell"
          onChange={(event) => onIntensityChange(Number(event.target.value))}
        />
        <output className="ls-transition-bridge__value">{percentage}%</output>
      </label>

      <div className="ls-transition-bridge__actions">
        <button
          className="ls-transition-bridge__button ls-transition-bridge__button--swell"
          type="button"
          disabled={!audioReady}
          onClick={onBuriedSwell}
        >
          Buried swell <span className="ls-transition-bridge__button-note">E1 → Am</span>
        </button>
        <button
          className="ls-transition-bridge__button ls-transition-bridge__button--cut"
          type="button"
          disabled={!audioReady}
          onClick={onDropToSilence}
        >
          Cut to reverb tail
        </button>
      </div>
    </section>
  )
}

export default TransitionBridge

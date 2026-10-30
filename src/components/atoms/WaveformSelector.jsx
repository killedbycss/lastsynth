import '../lastsynth-ui.css'

const WAVEFORMS = [
  { type: 'fatsine', symbol: '~' },
  { type: 'fattriangle', symbol: '△' },
  { type: 'fatsawtooth', symbol: '/|' },
  { type: 'fatsquare', symbol: '□' },
]

export function WaveformSelector({
  value,
  onChange,
  color = 'var(--ls-master)',
  disabled = false,
}) {
  return (
    <div
      className={`ls-wave-selector${disabled ? ' ls-wave-selector--disabled' : ''}`}
      style={{ '--ls-control-color': color }}
      role="group"
      aria-label="Waveform"
    >
      {WAVEFORMS.map(({ type, symbol }) => (
        <button
          className={`ls-wave-selector__button${value === type ? ' ls-wave-selector__button--active' : ''}`}
          type="button"
          key={type}
          disabled={disabled}
          aria-label={type}
          aria-pressed={value === type}
          title={type}
          onClick={() => onChange?.(type)}
        >
          {symbol}
        </button>
      ))}
    </div>
  )
}

export default WaveformSelector

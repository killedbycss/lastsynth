import { useId } from 'react'
import '../lastsynth-ui.css'

export function ChannelFader({
  label,
  value,
  min = -60,
  max = 6,
  step = 0.1,
  unit = 'dB',
  mode = 'volume',
  onChange,
  color = 'var(--ls-master)',
  disabled = false,
}) {
  const id = useId()
  const isPan = mode === 'pan'
  const numericValue = Number(value)
  const fill = max === min ? 0 : ((numericValue - min) / (max - min)) * 100

  return (
    <label
      className={`ls-fader ls-fader--${mode}${disabled ? ' ls-fader--disabled' : ''}`}
      htmlFor={id}
      style={{ '--ls-control-color': color, '--ls-fader-fill': `${fill}%` }}
    >
      <span className="ls-fader__header">
        <span className="ls-fader__label">{label}</span>
        <span className="ls-fader__value">
          {numericValue.toFixed(isPan ? 1 : 1)} {unit}
        </span>
      </span>
      <span className="ls-fader__control">
        <span className="ls-fader__track" aria-hidden="true">
          <span className="ls-fader__fill" />
          <span className="ls-fader__center" />
        </span>
        <input
          id={id}
          className="ls-fader__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange?.(Number(event.target.value))}
        />
      </span>
      {isPan ? (
        <span className="ls-fader__scale" aria-hidden="true">
          <span className="ls-fader__mark">L −1.0</span>
          <span className="ls-fader__mark ls-fader__mark--center">C 0.0</span>
          <span className="ls-fader__mark">+1.0 R</span>
        </span>
      ) : (
        <span className="ls-fader__scale" aria-hidden="true">
          <span className="ls-fader__mark">{min}</span>
          <span className="ls-fader__mark ls-fader__mark--center">0</span>
          <span className="ls-fader__mark">{max}</span>
        </span>
      )}
    </label>
  )
}

export default ChannelFader

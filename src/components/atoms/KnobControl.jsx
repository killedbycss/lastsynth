import { useId } from 'react'
import '../lastsynth-ui.css'

export function KnobControl({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  onChange,
  color = 'var(--ls-master)',
  disabled = false,
}) {
  const id = useId()
  const numericValue = Number(value)
  const normalized = max === min ? 0 : (numericValue - min) / (max - min)
  const angle = -135 + Math.min(1, Math.max(0, normalized)) * 270

  return (
    <label
      className={`ls-knob${disabled ? ' ls-knob--disabled' : ''}`}
      htmlFor={id}
      style={{ '--ls-control-color': color, '--ls-knob-angle': `${angle}deg` }}
    >
      <span className="ls-knob__label">{label}</span>
      <span className="ls-knob__dial">
        <svg className="ls-knob__svg" viewBox="0 0 72 72">
          <circle className="ls-knob__ticks" cx="36" cy="36" r="33" />
          <circle className="ls-knob__track" cx="36" cy="36" r="30" />
          <circle className="ls-knob__body" cx="36" cy="36" r="24" />
          <line className="ls-knob__indicator" x1="36" y1="36" x2="36" y2="17" />
        </svg>
        <input
          id={id}
          className="ls-knob__input"
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
      <span className="ls-knob__readout">
        <span className="ls-knob__value">{numericValue}</span>
        <span className="ls-knob__unit">{unit}</span>
      </span>
    </label>
  )
}

export default KnobControl

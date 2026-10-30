import '../lastsynth-ui.css'
import { BASS_NOTE_OPTIONS } from './noteOptions.js'

export function NoteSelector({
  value,
  onChange,
  label = null,
  ariaLabel = 'Bass note',
  options = BASS_NOTE_OPTIONS,
  color = 'var(--ls-bass)',
  disabled = false,
}) {
  const currentIndex = Math.max(0, options.indexOf(value))
  const selectOffset = (offset) => {
    const nextIndex = (currentIndex + offset + options.length) % options.length
    onChange?.(options[nextIndex])
  }

  return (
    <div
      className={`ls-note-selector${disabled ? ' ls-note-selector--disabled' : ''}`}
      style={{ '--ls-control-color': color }}
    >
      {label && <span className="ls-note-selector__label">{label}</span>}
      <span className="ls-note-selector__field">
        <button
          className="ls-note-selector__stepper ls-note-selector__stepper--previous"
          type="button"
          disabled={disabled}
          aria-label={`${ariaLabel}: previous note`}
          onClick={() => selectOffset(-1)}
        >
          −
        </button>
        <output className="ls-note-selector__value" aria-label={`${ariaLabel}: ${value}`}>{value}</output>
        <button
          className="ls-note-selector__stepper ls-note-selector__stepper--next"
          type="button"
          disabled={disabled}
          aria-label={`${ariaLabel}: next note`}
          onClick={() => selectOffset(1)}
        >
          +
        </button>
      </span>
    </div>
  )
}

export default NoteSelector

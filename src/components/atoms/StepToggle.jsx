import '../lastsynth-ui.css'

export function StepToggle({
  step,
  enabled = false,
  current = false,
  onToggle,
  color = 'var(--ls-master)',
  disabled = false,
}) {
  const modifiers = [
    enabled && 'ls-step-toggle--enabled',
    current && 'ls-step-toggle--current',
  ].filter(Boolean).join(' ')

  return (
    <button
      className={`ls-step-toggle${modifiers ? ` ${modifiers}` : ''}`}
      type="button"
      disabled={disabled}
      aria-pressed={enabled}
      aria-label={`Step ${step}${current ? ', currently playing' : ''}`}
      style={{ '--ls-control-color': color }}
      onClick={() => onToggle?.(!enabled)}
    >
      <span className="ls-step-toggle__playhead" aria-hidden="true" />
      <span className="ls-step-toggle__number">{String(step).padStart(2, '0')}</span>
      <span className="ls-step-toggle__state">{enabled ? 'On' : 'Off'}</span>
    </button>
  )
}

export default StepToggle

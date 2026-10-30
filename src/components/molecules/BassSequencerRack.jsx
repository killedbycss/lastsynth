import NoteSelector from '../atoms/NoteSelector.jsx'
import StepToggle from '../atoms/StepToggle.jsx'
import '../lastsynth-ui.css'

export function BassSequencerRack({
  notes = ['A1', 'C2', 'G1', 'E1'],
  enabledSteps = [true, true, true, true],
  currentStep = -1,
  running = false,
  onNoteChange,
  onStepToggle,
  onTriggerStep,
  color = 'var(--ls-bass)',
}) {
  return (
    <section
      className={`ls-bass-seq${running ? ' ls-bass-seq--running' : ''}`}
      style={{ '--ls-control-color': color }}
    >
      <header className="ls-bass-seq__header">
        <span className="ls-bass-seq__status">{running ? 'Running' : 'Held'}</span>
      </header>
      <div className="ls-bass-seq__steps">
        {notes.slice(0, 4).map((note, index) => (
          <article
            className={`ls-bass-seq__step${currentStep === index ? ' ls-bass-seq__step--current' : ''}`}
            key={index}
          >
            <StepToggle
              step={index + 1}
              enabled={enabledSteps[index] ?? true}
              current={currentStep === index}
              color={color}
              onToggle={(enabled) => onStepToggle?.(index, enabled)}
            />
            <NoteSelector
              ariaLabel={`Step ${index + 1} note`}
              value={note}
              color={color}
              onChange={(nextNote) => onNoteChange?.(index, nextNote)}
            />
            <button
              className="ls-bass-seq__trigger"
              type="button"
              onMouseDown={() => onTriggerStep?.(index, note)}
              aria-label={`Trigger step ${index + 1}, ${note}`}
            >
              ●
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

export default BassSequencerRack

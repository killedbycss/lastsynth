import NoteSelector from '../atoms/NoteSelector.jsx'
import StepToggle from '../atoms/StepToggle.jsx'
import '../lastsynth-ui.css'

const CHORD_OPTIONS = ['Am', 'C', 'G', 'Em', 'F', 'Dm']

export function ChordPadMatrix({ chords = ['Am', 'C', 'G', 'Em'], enabledSteps = [true, true, true, true], currentStep = -1, running = false, onChordChange, onStepToggle, onTriggerStep, color = 'var(--ls-pad)' }) {
  return (
    <section className={`ls-chord-matrix${running ? ' ls-chord-matrix--running' : ''}`} style={{ '--ls-control-color': color }}>
      <header className="ls-chord-matrix__header"><span className="ls-chord-matrix__status">{running ? 'Running' : 'Held'}</span></header>
      <div className="ls-chord-matrix__steps">
        {chords.slice(0, 4).map((chord, index) => (
          <article className={`ls-chord-matrix__step${currentStep === index ? ' ls-chord-matrix__step--current' : ''}`} key={index}>
            <StepToggle step={index + 1} enabled={enabledSteps[index] ?? true} current={currentStep === index} color={color} onToggle={(enabled) => onStepToggle?.(index, enabled)} />
            <NoteSelector ariaLabel={`Harmony ${index + 1}`} value={chord} options={CHORD_OPTIONS} color={color} onChange={(nextChord) => onChordChange?.(index, nextChord)} />
            <button className="ls-chord-matrix__trigger" type="button" onMouseDown={() => onTriggerStep?.(index, chord)} aria-label={`Trigger harmony ${index + 1}, ${chord}`}>•</button>
          </article>
        ))}
      </div>
    </section>
  )
}

export default ChordPadMatrix

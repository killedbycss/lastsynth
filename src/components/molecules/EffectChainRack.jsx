import { Children } from 'react'
import '../lastsynth-ui.css'

export function EffectChainRack({
  stages = ['OSC', 'FX 1', 'FX 2', 'PAN'],
  controls = [],
  color = 'var(--ls-master)',
}) {
  const controlItems = Children.toArray(controls)

  return (
    <section className="ls-fx-rack" style={{ '--ls-control-color': color }}>
      <div className="ls-fx-rack__route" aria-label={`Signal route: ${stages.join(' to ')}`}>
        {stages.map((stage, index) => (
          <span className="ls-fx-rack__route-group" key={`${stage}-${index}`}>
            <span className="ls-fx-rack__stage">{stage}</span>
            {index < stages.length - 1 && (
              <span className="ls-fx-rack__arrow" aria-hidden="true">→</span>
            )}
          </span>
        ))}
      </div>
      {controlItems.length > 0 && (
        <div className="ls-fx-rack__controls">
          {controlItems.map((control, index) => (
            <div className="ls-fx-rack__control" key={control.key ?? index}>{control}</div>
          ))}
        </div>
      )}
    </section>
  )
}

export default EffectChainRack

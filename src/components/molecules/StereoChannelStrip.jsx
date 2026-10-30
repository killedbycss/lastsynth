import ChannelFader from '../atoms/ChannelFader.jsx'
import '../lastsynth-ui.css'

export function StereoChannelStrip({
  name,
  channel = 'CH 1',
  volume = -6,
  pan = 0,
  level = 0,
  active = false,
  color = 'var(--ls-master)',
  onVolumeChange,
  onPanChange,
}) {
  const meterLevel = `${Math.min(100, Math.max(0, Number(level) * 100))}%`

  return (
    <section
      className={`ls-channel-strip${active ? ' ls-channel-strip--active' : ''}`}
      style={{ '--ls-control-color': color, '--ls-meter-level': meterLevel }}
    >
      <header className="ls-channel-strip__header">
        <span className="ls-channel-strip__channel">{channel}</span>
        <h3 className="ls-channel-strip__name">{name}</h3>
        <span className="ls-channel-strip__activity" aria-label={active ? 'Active' : 'Idle'} />
      </header>
      <div className="ls-channel-strip__meter" role="meter" aria-valuemin="0" aria-valuemax="1" aria-valuenow={level}>
        <span className="ls-channel-strip__meter-fill" />
        <span className="ls-channel-strip__meter-scale" aria-hidden="true">−∞&nbsp;&nbsp;−24&nbsp;&nbsp;−12&nbsp;&nbsp;0</span>
      </div>
      <div className="ls-channel-strip__controls">
        <ChannelFader
          label="Level"
          value={volume}
          min={-60}
          max={6}
          unit="dB"
          color={color}
          onChange={onVolumeChange}
        />
        <ChannelFader
          label="Pan"
          value={pan}
          min={-1}
          max={1}
          step={0.01}
          unit=""
          mode="pan"
          color={color}
          onChange={onPanChange}
        />
      </div>
      <div className="ls-channel-strip__panorama" aria-hidden="true">
        <span>L 40%</span>
        <span className="ls-channel-strip__panorama-center">← C →</span>
        <span>R 40%</span>
      </div>
    </section>
  )
}

export default StereoChannelStrip

import { useEffect, useRef } from 'react'
import KnobControl from '../atoms/KnobControl.jsx'
import StepToggle from '../atoms/StepToggle.jsx'

export function MasterHeaderBar({
  audioStatus,
  transportPlaying,
  bpm,
  pulsePattern,
  pulseRunning,
  currentPulseStep,
  onInitAudio,
  onTransportToggle,
  onBpmChange,
  onPulseToggle,
  onPulseStepToggle,
  getWaveformValues,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    let animationFrame = 0
    let lastDrawTime = 0

    const draw = (frameTime = 0) => {
      if (frameTime - lastDrawTime < 32) {
        animationFrame = requestAnimationFrame(draw)
        return
      }
      lastDrawTime = frameTime
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      context.strokeStyle = '#26303a'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(0, height / 2)
      context.lineTo(width, height / 2)
      context.stroke()

      const values = getWaveformValues()
      context.strokeStyle = '#10b981'
      context.lineWidth = 1.5
      context.beginPath()
      values.forEach((sample, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width
        const y = height / 2 + sample * height * 0.42
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
      animationFrame = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationFrame)
  }, [getWaveformValues])

  const isReady = audioStatus === 'ready'
  const isInitializing = audioStatus === 'initializing'

  return (
    <header className="ls-master-header">
      <div className="ls-master-header__brand">
        <span className="ls-master-header__logo">Lastsynth</span>
        <span className="ls-master-header__descriptor">Dual-voice atmospheric instrument</span>
      </div>

      <div className="ls-master-header__power-group">
        <button
          className={`ls-master-header__power${isReady ? ' ls-master-header__power--active' : ''}`}
          type="button"
          disabled={isInitializing}
          onClick={onInitAudio}
        >
          {isInitializing ? 'Starting audio…' : isReady ? 'Audio engine on' : 'Start audio engine'}
        </button>
        <button
          className={`ls-master-header__transport${transportPlaying ? ' ls-master-header__transport--active' : ''}`}
          type="button"
          disabled={!isReady}
          onClick={onTransportToggle}
        >
          {transportPlaying ? 'Stop' : 'Play'}
        </button>
      </div>

      <div className="ls-master-header__tempo">
        <KnobControl
          label="BPM"
          value={bpm}
          min={50}
          max={120}
          step={1}
          unit="BPM"
          color="var(--ls-master)"
          onChange={onBpmChange}
        />
      </div>

      <section className="ls-master-header__pulse">
        <div className="ls-master-header__pulse-heading">
          <span className="ls-master-header__pulse-label">Heartbeat pulse</span>
          <button
            className={`ls-master-header__pulse-toggle${pulseRunning ? ' ls-master-header__pulse-toggle--active' : ''}`}
            type="button"
            disabled={!isReady}
            onClick={onPulseToggle}
          >
            {pulseRunning ? 'Running' : 'Held'}
          </button>
        </div>
        <div className="ls-master-header__pulse-steps">
          {pulsePattern.map((enabled, index) => (
            <StepToggle
              key={index}
              step={index + 1}
              enabled={Boolean(enabled)}
              current={pulseRunning && currentPulseStep === index}
              color="var(--ls-master)"
              onToggle={(nextEnabled) => onPulseStepToggle(index, nextEnabled)}
            />
          ))}
        </div>
      </section>

      <figure className="ls-master-header__scope">
        <figcaption className="ls-master-header__scope-label">Master waveform</figcaption>
        <canvas className="ls-master-header__canvas" ref={canvasRef} />
      </figure>
    </header>
  )
}

export default MasterHeaderBar

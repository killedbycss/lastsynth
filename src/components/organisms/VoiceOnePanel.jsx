import KnobControl from '../atoms/KnobControl.jsx'
import WaveformSelector from '../atoms/WaveformSelector.jsx'
import BassSequencerRack from '../molecules/BassSequencerRack.jsx'
import EffectChainRack from '../molecules/EffectChainRack.jsx'
import StereoChannelStrip from '../molecules/StereoChannelStrip.jsx'

export function VoiceOnePanel({
  audioReady,
  bassNotes,
  bassSteps,
  bassLoop,
  currentBassStep,
  waveform,
  distortion,
  phaserWet,
  delayWet,
  reverbWet,
  volume,
  pan,
  onBassLoopToggle,
  onBassNoteChange,
  onBassStepToggle,
  onBassTrigger,
  onWaveformChange,
  onDistortionChange,
  onPhaserWetChange,
  onDelayWetChange,
  onReverbWetChange,
  onVolumeChange,
  onPanChange,
}) {
  const accent = 'var(--ls-bass)'
  const controls = [
    <KnobControl key="drive" label="Drive" value={distortion} min={0} max={1} step={0.01} unit="" color={accent} onChange={onDistortionChange} />,
    <KnobControl key="phase" label="Phase" value={phaserWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onPhaserWetChange} />,
    <KnobControl key="delay" label="Delay" value={delayWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onDelayWetChange} />,
    <KnobControl key="space" label="Space" value={reverbWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onReverbWetChange} />,
  ]

  return (
    <section className="ls-voice-panel ls-voice-panel--amber">
      <header className="ls-voice-panel__header">
        <div className="ls-voice-panel__identity">
          <span className="ls-voice-panel__index">Voice 1 — Sub Bass</span>
          <h2 className="ls-voice-panel__title">Roar bass <span className="ls-voice-panel__type">Mono synth · left</span></h2>
        </div>
        <WaveformSelector value={waveform} onChange={onWaveformChange} color={accent} />
        <button
          className={`ls-voice-panel__loop${bassLoop ? ' ls-voice-panel__loop--active' : ''}`}
          type="button"
          disabled={!audioReady}
          onClick={onBassLoopToggle}
        >
          Bass loop: {bassLoop ? 'On' : 'Off'}
        </button>
      </header>

      <div className="ls-voice-panel__body">
        <div className="ls-voice-panel__performance">
          <BassSequencerRack
            notes={bassNotes}
            enabledSteps={bassSteps}
            currentStep={currentBassStep}
            running={bassLoop}
            color={accent}
            onNoteChange={onBassNoteChange}
            onStepToggle={onBassStepToggle}
            onTriggerStep={onBassTrigger}
          />
        </div>
        <div className="ls-voice-panel__processing">
          <EffectChainRack
            stages={['Drive', 'Phase', 'Delay', 'Space', 'L −0.4']}
            controls={controls}
            color={accent}
          />
          <StereoChannelStrip
            name="Roar bass"
            channel="Channel 1"
            volume={volume}
            pan={pan}
            level={bassLoop ? 0.78 : 0.18}
            active={bassLoop || currentBassStep >= 0}
            color={accent}
            onVolumeChange={onVolumeChange}
            onPanChange={onPanChange}
          />
        </div>
      </div>
    </section>
  )
}

export default VoiceOnePanel

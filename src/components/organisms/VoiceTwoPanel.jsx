import KnobControl from '../atoms/KnobControl.jsx'
import WaveformSelector from '../atoms/WaveformSelector.jsx'
import ChordPadMatrix from '../molecules/ChordPadMatrix.jsx'
import EffectChainRack from '../molecules/EffectChainRack.jsx'
import StereoChannelStrip from '../molecules/StereoChannelStrip.jsx'

export function VoiceTwoPanel({ audioReady, padChords, padSteps, padLoop, currentPadStep, waveform, chorusWet, tremoloWet, delayWet, reverbWet, volume, pan, onPadLoopToggle, onPadChordChange, onPadStepToggle, onPadTrigger, onWaveformChange, onChorusWetChange, onTremoloWetChange, onDelayWetChange, onReverbWetChange, onVolumeChange, onPanChange }) {
  const accent = 'var(--ls-pad)'
  const controls = [
    <KnobControl key="chorus" label="Chorus" value={chorusWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onChorusWetChange} />,
    <KnobControl key="trem" label="Trem" value={tremoloWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onTremoloWetChange} />,
    <KnobControl key="echo" label="Echo" value={delayWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onDelayWetChange} />,
    <KnobControl key="hall" label="Hall" value={reverbWet} min={0} max={1} step={0.01} unit="" color={accent} onChange={onReverbWetChange} />,
  ]
  return (
    <section className="ls-voice-panel ls-voice-panel--cyan">
      <header className="ls-voice-panel__header">
        <div className="ls-voice-panel__identity"><span className="ls-voice-panel__index">Voice 2 — Choir / Bowed</span><h2 className="ls-voice-panel__title">Ghost choir <span className="ls-voice-panel__type">Poly synth · right</span></h2></div>
        <WaveformSelector value={waveform} onChange={onWaveformChange} color={accent} />
        <button className={`ls-voice-panel__loop${padLoop ? ' ls-voice-panel__loop--active' : ''}`} type="button" disabled={!audioReady} onClick={onPadLoopToggle}>Choir loop: {padLoop ? 'On' : 'Off'}</button>
      </header>
      <div className="ls-voice-panel__body">
        <div className="ls-voice-panel__performance"><ChordPadMatrix chords={padChords} enabledSteps={padSteps} currentStep={currentPadStep} running={padLoop} color={accent} onChordChange={onPadChordChange} onStepToggle={onPadStepToggle} onTriggerStep={onPadTrigger} /></div>
        <div className="ls-voice-panel__processing">
          <EffectChainRack stages={['Chorus', 'Trem', 'Echo', 'Hall', 'R +0.4']} controls={controls} color={accent} />
          <StereoChannelStrip name="Ghost choir" channel="Channel 2" volume={volume} pan={pan} level={padLoop ? 0.72 : 0.12} active={padLoop || currentPadStep >= 0} color={accent} onVolumeChange={onVolumeChange} onPanChange={onPanChange} />
        </div>
      </div>
    </section>
  )
}

export default VoiceTwoPanel

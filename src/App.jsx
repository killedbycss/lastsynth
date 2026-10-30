import { useCallback, useEffect, useMemo, useState } from 'react'
import synthEngine from './audio/synthEngine.js'
import DragValue from './components/atoms/DragValue.jsx'
import LiquidShaderCanvas from './components/organisms/LiquidShaderCanvas.jsx'
import logo from '../logo.png'
import './App.css'

const BASS_OPTIONS = ['E1', 'F1', 'G1', 'A1', 'B1', 'C2', 'D2']
const CHORD_OPTIONS = ['Am', 'C', 'G', 'Em', 'F', 'Dm']
const INITIAL_PULSE = [1, 0, 0, 1, 0, 1]

function App() {
  const [audioStatus, setAudioStatus] = useState('off')
  const [playerEnabled, setPlayerEnabled] = useState(false)
  const [activeSection, setActiveSection] = useState('bass')
  const [selected, setSelected] = useState({ bass: 0, choir: 0, pulse: 0 })
  const [bpm, setBpm] = useState(65)
  const [pulse, setPulse] = useState(INITIAL_PULSE)
  const [pulseLoop, setPulseLoop] = useState(false)
  const [pulsePlayhead, setPulsePlayhead] = useState(-1)
  const [bassNotes, setBassNotes] = useState(['A1', 'G1', 'E1', 'A1'])
  const [bassLoop, setBassLoop] = useState(false)
  const [bassPlayhead, setBassPlayhead] = useState(-1)
  const [bassFx, setBassFx] = useState([0.2, 0.18, 0.16, 0.22])
  const [choirChords, setChoirChords] = useState(['C', 'G', 'Em', 'Am'])
  const [choirLoop, setChoirLoop] = useState(false)
  const [choirPlayhead, setChoirPlayhead] = useState(-1)
  const [choirFx, setChoirFx] = useState([0.5, 0.16, 0.3, 0.65])
  const ready = audioStatus === 'ready'

  useEffect(() => {
    const offPulse = synthEngine.subscribePulseStep((step) => setPulsePlayhead(step < 6 ? step : -1))
    const offBass = synthEngine.subscribeBassStep(setBassPlayhead)
    const offChoir = synthEngine.subscribePadStep(setChoirPlayhead)
    const offLoops = synthEngine.subscribeLoopState((state) => { setPulseLoop(state.pulseLoopEnabled); setBassLoop(state.bassLoopEnabled); setChoirLoop(state.padLoopEnabled) })
    return () => { offPulse(); offBass(); offChoir(); offLoops() }
  }, [])

  const initialize = useCallback(async () => {
    if (ready || audioStatus === 'initializing') return true
    setAudioStatus('initializing')
    try {
      await synthEngine.initAudio(); synthEngine.setBpm(bpm)
      pulse.forEach((value, index) => synthEngine.setPulseStep(index, value)); synthEngine.setPulseStep(6, false); synthEngine.setPulseStep(7, false)
      bassNotes.forEach((note, index) => synthEngine.setBassStepNote(index, note)); choirChords.forEach((chord, index) => synthEngine.setPadStepChord(index, chord))
      synthEngine.setBassDistortion(bassFx[0]); synthEngine.setBassPhaserWet(bassFx[1]); synthEngine.setBassDelayWet(bassFx[2]); synthEngine.setBassReverbWet(bassFx[3])
      synthEngine.setPadChorusWet(choirFx[0]); synthEngine.setPadTremoloWet(choirFx[1]); synthEngine.setPadDelayWet(choirFx[2]); synthEngine.setPadReverbWet(choirFx[3])
      synthEngine.setBassPan(-0.68); synthEngine.setPadPan(0.68); synthEngine.setTransitionIntensity(0); synthEngine.toggleTransport(false)
      setAudioStatus('ready'); return true
    } catch (error) { console.error(error); setAudioStatus('error'); return false }
  }, [audioStatus, bassFx, bassNotes, bpm, choirChords, choirFx, pulse, ready])

  const stopEverything = useCallback(() => {
    if (!ready) return
    synthEngine.stopAllAudio()
    setPulsePlayhead(-1); setBassPlayhead(-1); setChoirPlayhead(-1)
  }, [ready])

  const togglePlayer = useCallback(async () => {
    if (playerEnabled) { stopEverything(); setPlayerEnabled(false); return }
    if (await initialize()) setPlayerEnabled(true)
  }, [initialize, playerEnabled, stopEverything])

  const toggleBass = useCallback(() => { if (!playerEnabled || !ready) return; synthEngine.toggleTransport(true); setBassLoop(synthEngine.toggleBassLoop(!bassLoop)) }, [bassLoop, playerEnabled, ready])
  const toggleChoir = useCallback(() => { if (!playerEnabled || !ready) return; synthEngine.toggleTransport(true); setChoirLoop(synthEngine.togglePadLoop(!choirLoop)) }, [choirLoop, playerEnabled, ready])
  const togglePulse = useCallback(() => { if (!playerEnabled || !ready) return; synthEngine.toggleTransport(true); setPulseLoop(synthEngine.togglePulseLoop(!pulseLoop)) }, [playerEnabled, pulseLoop, ready])

  const changeBassNote = useCallback((index, note) => { setBassNotes((values) => values.map((value, i) => i === index ? note : value)); if (ready) synthEngine.setBassStepNote(index, note) }, [ready])
  const changeChoirChord = useCallback((index, chord) => { setChoirChords((values) => values.map((value, i) => i === index ? chord : value)); if (ready) synthEngine.setPadStepChord(index, chord) }, [ready])
  const bassSetters = useMemo(() => [synthEngine.setBassDistortion, synthEngine.setBassPhaserWet, synthEngine.setBassDelayWet, synthEngine.setBassReverbWet], [])
  const choirSetters = useMemo(() => [synthEngine.setPadChorusWet, synthEngine.setPadTremoloWet, synthEngine.setPadDelayWet, synthEngine.setPadReverbWet], [])
  const changeFx = useCallback((section, index, value) => {
    const stateIndex = index - 4; const setter = section === 'bass' ? setBassFx : setChoirFx; const engineSetter = section === 'bass' ? bassSetters[stateIndex] : choirSetters[stateIndex]
    setter((values) => values.map((item, i) => i === stateIndex ? value : item)); if (ready) engineSetter(value)
  }, [bassSetters, choirSetters, ready])
  const changePulse = useCallback((index, value) => { setPulse((values) => values.map((item, i) => i === index ? Number(value) : item)); if (ready) synthEngine.setPulseStep(index, value) }, [ready])
  const changeBpm = useCallback((value) => { setBpm(value); if (ready) synthEngine.setBpm(value) }, [ready])
  const select = (section, index) => { setActiveSection(section); setSelected((value) => ({ ...value, [section]: index })) }

  useEffect(() => {
    const onKey = (event) => {
      if (event.altKey && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
        event.preventDefault(); event.stopPropagation(); document.activeElement?.blur?.()
        const section = { Digit1: 'bass', Digit2: 'choir', Digit3: 'pulse' }[event.code]
        setActiveSection(section); setSelected((value) => ({ ...value, [section]: 0 })); return
      }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (event.key === '0') { event.preventDefault(); ({ bass: toggleBass, choir: toggleChoir, pulse: togglePulse })[activeSection]() ; return }
      const index = Number(event.key) - 1; const limit = activeSection === 'pulse' ? 6 : 8
      if (index >= 0 && index < limit) { event.preventDefault(); setSelected((value) => ({ ...value, [activeSection]: index })); return }
      const direction = event.key === '+' || event.key === '=' || event.key === 'ArrowUp' ? 1 : event.key === '-' || event.key === '_' || event.key === 'ArrowDown' ? -1 : 0
      if (!direction || !playerEnabled) return
      event.preventDefault(); const current = selected[activeSection]
      if (activeSection === 'pulse') { changePulse(current, !pulse[current]); return }
      if (current < 4) {
        const options = activeSection === 'bass' ? BASS_OPTIONS : CHORD_OPTIONS; const values = activeSection === 'bass' ? bassNotes : choirChords; const handler = activeSection === 'bass' ? changeBassNote : changeChoirChord; const old = options.indexOf(values[current]); handler(current, options[(old + direction + options.length) % options.length])
      } else { const values = activeSection === 'bass' ? bassFx : choirFx; changeFx(activeSection, current, Math.min(1, Math.max(0, Number((values[current - 4] + direction * .01).toFixed(2))))) }
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [activeSection, bassFx, bassNotes, changeBassNote, changeChoirChord, changeFx, changePulse, choirChords, choirFx, playerEnabled, pulse, selected, toggleBass, toggleChoir, togglePulse])

  const voice = (section) => {
    const bass = section === 'bass'; const values = bass ? bassNotes : choirChords; const fx = bass ? bassFx : choirFx; const loop = bass ? bassLoop : choirLoop; const playhead = bass ? bassPlayhead : choirPlayhead
    const fxNames = bass ? ['Drive', 'Phase', 'Delay', 'Space'] : ['Chorus', 'Trem', 'Echo', 'Setting']; const options = bass ? BASS_OPTIONS : CHORD_OPTIONS
    return <section className={`ls-voice ls-voice--${section}${activeSection === section ? ' ls-section--active' : ''}`} aria-label={bass ? 'Bass' : 'Choir'}>
      <h2>{bass ? 'Bass' : 'Choir'}</h2><button className={`ls-capsule ls-capsule--wide${loop ? ' is-on' : ''}`} disabled={!playerEnabled} onClick={bass ? toggleBass : toggleChoir}>{loop ? 'Stop' : 'Start'}</button>
      <div className="ls-sequence">{values.map((value, index) => <div className={playhead === index ? 'is-playing' : ''} key={index}><DragValue value={value} options={options} label={`${bass ? 'Bass' : 'Choir'} ${index + 1}`} disabled={!playerEnabled} selected={activeSection === section && selected[section] === index} onSelect={() => select(section, index)} onChange={(next) => bass ? changeBassNote(index, next) : changeChoirChord(index, next)} /></div>)}</div>
      <div className="ls-effects">{fx.map((value, index) => <DragValue key={fxNames[index]} value={value} min={0} max={1} step={.01} label={fxNames[index]} variant="dial" disabled={!playerEnabled} selected={activeSection === section && selected[section] === index + 4} onSelect={() => select(section, index + 4)} onChange={(next) => changeFx(section, index + 4, next)} />)}</div>
    </section>
  }

  return <main className={`ls-app${playerEnabled ? ' ls-app--enabled' : ''}`}>
    <LiquidShaderCanvas getWaveformValues={synthEngine.getWaveformValues} bassActive={bassLoop} choirActive={choirLoop} pulseActive={pulseLoop} />
    <div className="ls-logo"><img src={logo} alt="Последний синтезатор" draggable="false" /></div>
    <div className="ls-rorschach-label" aria-hidden="true" />
    {voice('bass')}{voice('choir')}
    <section className={`ls-pulse${activeSection === 'pulse' ? ' ls-section--active' : ''}`}><h2>Pulse</h2><div className="ls-pulse__controls"><button className={`ls-capsule ls-capsule--pulse${pulseLoop ? ' is-on' : ''}`} disabled={!playerEnabled} onClick={togglePulse}>{pulseLoop ? 'Stop' : 'Start'}</button>{pulse.map((value, index) => <button key={index} disabled={!playerEnabled} className={`ls-pulse-step${value ? ' is-on' : ''}${pulsePlayhead === index ? ' is-playing' : ''}${activeSection === 'pulse' && selected.pulse === index ? ' is-selected' : ''}`} onClick={() => { select('pulse', index); changePulse(index, !value) }}>{index + 1}</button>)}<DragValue value={bpm} min={50} max={120} step={1} label="per minute" variant="bpm" disabled={!playerEnabled} onChange={changeBpm} /></div></section>
    <section className="ls-player"><h2>Player</h2><button className={`ls-capsule ls-capsule--player${playerEnabled ? ' is-on' : ''}`} disabled={audioStatus === 'initializing'} onClick={togglePlayer}>{audioStatus === 'initializing' ? 'Loading' : playerEnabled ? 'Stop' : 'Start'}</button>{audioStatus === 'error' && <span>Audio unavailable</span>}</section>
  </main>
}

export default App

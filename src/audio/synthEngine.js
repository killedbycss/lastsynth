import * as Tone from "tone";

export const PAD_CHORDS = {
  Am: ["A3", "C4", "E4"],
  C: ["G3", "C4", "E4"],
  G: ["G3", "B3", "D4"],
  Em: ["E3", "G3", "B3"],
  F: ["F3", "A3", "C4"],
  Dm: ["D3", "F3", "A3"],
};

const DEFAULT_PULSE_PATTERN = [1, 0, 0, 1, 0, 1, 0, 0];
const DEFAULT_BASS_NOTES = ["A1", "C2", "G1", "E1"];
const DEFAULT_PAD_CHORD_STEPS = ["Am", "C", "G", "Em"];
const STRUM_STEPS = new Set([0, 2, 3, 4, 6, 7]);
const STRUM_VELOCITIES = [0.88, 0, 0.55, 0.68, 0.94, 0, 0.58, 0.76];
const MAIN_TOM_STEPS = new Set([0, 3, 4]);
const TOM_FILL_STEPS = new Set([6, 7]);
const WAVEFORM_TYPES = new Set(["fatsine", "fattriangle", "fatsawtooth", "fatsquare"]);

let initialized = false;
let initPromise = null;
let pulseLoopEnabled = false;
let bassLoopEnabled = false;
let padLoopEnabled = false;
let transitionIntensity = 0;
let bassBaseVolume = -4;
let padBaseVolume = -6;
let lastBassDistortion = 0.45;
let lastPadNotes = PAD_CHORDS.Am;
let buriedSwellEventId = null;
let buriedBassStartTime = null;
let buriedPadStartTime = null;
const heldPadNoteCounts = new Map();
const loopStateListeners = new Set();

let masterBus;
let masterCompressor;
let masterLimiter;
let waveform;
let catharsisBus;
let catharsisCompressor;

let bassSynth;
let manualBassSynth;
let bassDistortion;
let bassFilter;
let bassChannel;
let bassPhaser;
let bassDelay;
let bassReverb;

let padSynth;
let padChorus;
let padTremolo;
let padDelay;
let padReverb;
let padChannel;
let padCompressor;
let padPerformanceGain;
let padToneFilter;
let bowedHighSynth;
let bowedHighGain;
let catharsisReverb;

let heartbeatSynth;
let heartbeatFilter;
let heartbeatChannel;
let shakerSynth;
let shakerFilter;
let shakerChannel;
let marchTomSynth;
let marchTomGain;
let strumNoiseSynth;
let strumNoiseGain;
let strumNoiseFilter;
let guitarStrumSynth;
let guitarStrumFilter;
let guitarStrumGain;
let catharsisRimSnare;
let catharsisRimGain;

let pulseSequence;
let bassSequence;
let padSequence;

const pulsePattern = [...DEFAULT_PULSE_PATTERN];
const bassNotes = [...DEFAULT_BASS_NOTES];
const bassStepEnabled = [true, true, true, true];
const padStepChords = [...DEFAULT_PAD_CHORD_STEPS];
const padStepEnabled = [true, true, true, true];
const pulseStepListeners = new Set();
const bassStepListeners = new Set();
const padStepListeners = new Set();
const padChords = Object.fromEntries(
  Object.entries(PAD_CHORDS).map(([name, notes]) => [name, [...notes]]),
);

function requireAudio() {
  if (!initialized) {
    throw new Error("Audio engine is not initialized. Call and await initAudio() first.");
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function assertStepIndex(index, length, label) {
  if (!Number.isInteger(index) || index < 0 || index >= length) {
    throw new RangeError(`${label} must be an integer from 0 to ${length - 1}.`);
  }
}

function assertNote(note, label = "note") {
  if (typeof note !== "string" || note.trim() === "") {
    throw new TypeError(`${label} must be a non-empty Tone.js note name.`);
  }
}

function assertWaveform(type) {
  if (!WAVEFORM_TYPES.has(type)) {
    throw new RangeError(`Unsupported waveform: ${type}.`);
  }
}

function octaveUp(notes) {
  return notes.map((note) => Tone.Frequency(note).transpose(12).toNote());
}

function connectToMaster(node) {
  node.connect(masterBus);
  return node;
}

function notifyLoopState() {
  const state = { pulseLoopEnabled, bassLoopEnabled, padLoopEnabled };
  loopStateListeners.forEach((listener) => listener(state));
}

function updatePadMix(rampTime = 0.08) {
  if (!initialized && !padPerformanceGain) return;
  const activeNotes = Math.max(1, heldPadNoteCounts.size);
  const chordEnergyGain = Math.min(1, Math.sqrt(3 / activeNotes));
  padPerformanceGain.gain.rampTo(chordEnergyGain, rampTime);
  padChannel.volume.rampTo(padBaseVolume - transitionIntensity * 2.2, rampTime);
}

function updateCatharsisMix(intensity, rampTime = 0.8) {
  const amount = clamp(intensity, 0, 1);
  marchTomGain.gain.rampTo(amount * 0.18, rampTime);
  guitarStrumGain.gain.rampTo(amount * 0.12, rampTime);
  strumNoiseGain.gain.rampTo(amount * 0.022, rampTime);
  catharsisRimGain.gain.rampTo(amount * 0.11, rampTime);
  bowedHighGain.gain.rampTo(amount * 0.1, Math.max(rampTime, 1.2));
}

export function initAudio() {
  if (initialized) return Promise.resolve(synthEngine);
  if (!initPromise) {
    initPromise = initializeAudio().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function initializeAudio() {

  await Tone.start();
  Tone.getContext().lookAhead = 0.12;

  waveform = new Tone.Waveform(128);
  masterLimiter = new Tone.Limiter(-1).toDestination();
  masterLimiter.connect(waveform);
  masterCompressor = new Tone.Compressor({
    threshold: -10,
    ratio: 2.5,
    attack: 0.015,
    release: 0.22,
    knee: 8,
  }).connect(masterLimiter);
  masterBus = new Tone.Gain(0.62).connect(masterCompressor);
  catharsisCompressor = new Tone.Compressor({
    threshold: -20,
    ratio: 4,
    attack: 0.008,
    release: 0.16,
    knee: 12,
  }).connect(masterBus);
  catharsisBus = new Tone.Gain(0.72).connect(catharsisCompressor);

  bassChannel = connectToMaster(new Tone.Channel({ pan: -0.68, volume: -4 }));
  bassReverb = new Tone.Reverb({ decay: 3.8, wet: 0.22 }).connect(bassChannel);
  bassDelay = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.28, wet: 0.16 }).connect(bassReverb);
  bassPhaser = new Tone.Phaser({
    frequency: 0.22,
    octaves: 2.5,
    baseFrequency: 110,
    wet: 0.18,
  }).connect(bassDelay);
  bassDistortion = new Tone.Distortion(0.45).connect(bassPhaser);
  bassFilter = new Tone.Filter({
    frequency: 320,
    type: "lowpass",
    rolloff: -12,
    Q: 0.7,
  }).connect(bassDistortion);
  bassSynth = new Tone.MonoSynth({
    oscillator: { type: "fatsawtooth", count: 3, spread: 25 },
    portamento: 0.08,
    envelope: { attack: 0.08, decay: 0.4, sustain: 0.85, release: 1.2 },
  }).connect(bassFilter);
  manualBassSynth = new Tone.MonoSynth({
    oscillator: { type: "fatsawtooth", count: 2, spread: 18 },
    portamento: 0.04,
    envelope: { attack: 0.035, decay: 0.3, sustain: 0.78, release: 0.9 },
  }).connect(bassFilter);

  padChannel = connectToMaster(new Tone.Channel({ pan: 0.68, volume: -6 }));
  padCompressor = new Tone.Compressor({
    threshold: -13,
    ratio: 2.2,
    attack: 0.025,
    release: 0.18,
    knee: 10,
  }).connect(padChannel);
  padReverb = new Tone.Reverb({ decay: 6, wet: 0.65 }).connect(padCompressor);
  padDelay = new Tone.FeedbackDelay({
    delayTime: "8n.",
    feedback: 0.35,
    wet: 0.3,
  }).connect(padReverb);
  padTremolo = new Tone.Tremolo({ frequency: 3.2, depth: 0.55, wet: 0.16 }).connect(padDelay).start();
  padChorus = new Tone.Chorus(3, 2.5, 0.5).connect(padTremolo).start();
  padToneFilter = new Tone.Filter({ frequency: 1400, type: "lowpass", rolloff: -12 }).connect(padChorus);
  padPerformanceGain = new Tone.Gain(1).connect(padToneFilter);
  padSynth = new Tone.PolySynth(Tone.Synth, {
    // Chorus already supplies stereo width. A single oscillator per voice keeps
    // long releases from saturating the audio thread during live chord changes.
    maxPolyphony: 64,
    oscillator: { type: "fattriangle", count: 2, spread: 20 },
    envelope: { attack: 1, decay: 0.8, sustain: 0.75, release: 2.8 },
  }).connect(padPerformanceGain);

  catharsisReverb = new Tone.Reverb({ decay: 4.8, wet: 0.34 }).connect(catharsisBus);
  bowedHighGain = new Tone.Gain(0).connect(catharsisReverb);
  bowedHighSynth = new Tone.PolySynth(Tone.MonoSynth, {
    maxPolyphony: 24,
    oscillator: { type: "sine" },
    portamento: 0.25,
    envelope: { attack: 1.4, decay: 0.8, sustain: 0.72, release: 4.5 },
    filter: { type: "lowpass", frequency: 5200, rolloff: -12 },
  }).connect(bowedHighGain);

  heartbeatChannel = connectToMaster(new Tone.Channel({ pan: 0, volume: -6 }));
  heartbeatFilter = new Tone.Filter(180, "lowpass").connect(heartbeatChannel);
  heartbeatSynth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 3,
  }).connect(heartbeatFilter);

  shakerChannel = connectToMaster(new Tone.Channel({ pan: 0, volume: -18 }));
  shakerFilter = new Tone.Filter(1200, "bandpass").connect(shakerChannel);
  shakerSynth = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.005, decay: 0.05, sustain: 0 },
  }).connect(shakerFilter);

  marchTomGain = new Tone.Gain(0).connect(catharsisReverb);
  marchTomSynth = new Tone.PolySynth(Tone.MembraneSynth, {
    maxPolyphony: 4,
    pitchDecay: 0.12,
    octaves: 4,
    envelope: { attack: 0.035, decay: 1.1, sustain: 0.08, release: 1.8 },
  }).connect(marchTomGain);

  guitarStrumGain = new Tone.Gain(0).connect(catharsisReverb);
  guitarStrumFilter = new Tone.Filter({ frequency: 2200, type: "bandpass", Q: 0.8 }).connect(guitarStrumGain);
  guitarStrumSynth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 32,
    oscillator: { type: "fatsawtooth", count: 2, spread: 12 },
    envelope: { attack: 0.005, decay: 0.18, sustain: 0.05, release: 0.25 },
  }).connect(guitarStrumFilter);

  strumNoiseFilter = new Tone.Filter({ frequency: 1650, type: "bandpass", Q: 0.7 }).connect(catharsisBus);
  strumNoiseGain = new Tone.Gain(0).connect(strumNoiseFilter);
  strumNoiseSynth = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.002, decay: 0.025, sustain: 0, release: 0.02 },
  }).connect(strumNoiseGain);

  catharsisRimGain = new Tone.Gain(0).connect(catharsisReverb);
  const catharsisRimNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.12 },
  }).connect(catharsisRimGain);
  const catharsisRimBody = new Tone.MembraneSynth({
    pitchDecay: 0.025,
    octaves: 2,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.45 },
  }).connect(catharsisRimGain);
  catharsisRimSnare = { noise: catharsisRimNoise, body: catharsisRimBody };

  pulseSequence = new Tone.Sequence(
    (time, stepIndex) => {
      const quarterNote = 60 / Tone.Transport.bpm.value;
      const sixteenthNote = quarterNote / 4;
      Tone.Draw.schedule(() => {
        pulseStepListeners.forEach((listener) => listener(stepIndex));
      }, time);
      if (transitionIntensity > 0.2 && STRUM_STEPS.has(stepIndex)) {
        const strumVelocity = STRUM_VELOCITIES[stepIndex];
        const isUpstroke = stepIndex % 2 === 1;
        lastPadNotes.forEach((_, noteOffset) => {
          const noteIndex = isUpstroke ? lastPadNotes.length - 1 - noteOffset : noteOffset;
          guitarStrumSynth.triggerAttackRelease(
            lastPadNotes[noteIndex],
            sixteenthNote,
            time + noteOffset * 0.008,
            strumVelocity,
          );
        });
        strumNoiseSynth.triggerAttackRelease(quarterNote / 16, time + 0.004, strumVelocity * 0.32);
      }

      const isMainTom = MAIN_TOM_STEPS.has(stepIndex);
      const isTomFill = transitionIntensity > 0.65 && TOM_FILL_STEPS.has(stepIndex);
      if (transitionIntensity > 0.3 && (isMainTom || isTomFill)) {
        const tomNote = stepIndex === 0 || stepIndex === 4 || stepIndex === 7 ? "A1" : "E1";
        marchTomSynth.triggerAttackRelease(tomNote, quarterNote / 2, time, isTomFill ? 0.82 : 0.96);
      }

      if (transitionIntensity > 0.5 && (stepIndex === 4 || stepIndex === 7)) {
        const rimVelocity = stepIndex === 4 ? 0.92 : 0.76;
        catharsisRimSnare.noise.triggerAttackRelease(sixteenthNote, time, rimVelocity);
        catharsisRimSnare.body.triggerAttackRelease("E2", sixteenthNote, time, rimVelocity * 0.72);
      }
      if (!pulsePattern[stepIndex]) return;
      heartbeatSynth.triggerAttackRelease("C1", sixteenthNote, time, 0.9);
      shakerSynth.triggerAttackRelease(quarterNote / 8, time + 0.01, 0.55);
    },
    pulsePattern.map((_, index) => index),
    "16n",
  );

  bassSequence = new Tone.Sequence(
    (time, stepIndex) => {
      Tone.Draw.schedule(() => {
        bassStepListeners.forEach((listener) => listener(stepIndex));
      }, time);
      if (!bassStepEnabled[stepIndex]) return;
      const stepDuration = Math.max(0.05, (60 / Tone.Transport.bpm.value) * 4 - 0.025);
      bassSynth.triggerAttackRelease(bassNotes[stepIndex], stepDuration, time, 0.86);
    },
    bassNotes.map((_, index) => index),
    "1m",
  );

  padSequence = new Tone.Sequence(
    (time, stepIndex) => {
      Tone.Draw.schedule(() => {
        padStepListeners.forEach((listener) => listener(stepIndex));
      }, time);
      if (!padStepEnabled[stepIndex]) return;
      const chordName = padStepChords[stepIndex];
      const notes = PAD_CHORDS[chordName];
      lastPadNotes = [...notes];
      padSynth.triggerAttackRelease(notes, "1m", time, 0.72);
      bowedHighSynth.triggerAttackRelease(octaveUp(notes), "1m", time, 0.46);
    },
    padStepChords.map((_, index) => index),
    "1m",
  );

  await Promise.all([catharsisReverb.ready, bassReverb.ready, padReverb.ready]);
  Tone.Transport.bpm.value = 68;
  Tone.Transport.start();
  initialized = true;
  setTransitionIntensity(0);

  return synthEngine;
}

export function setBassVolume(decibels) {
  requireAudio();
  bassBaseVolume = clamp(decibels, -60, 12);
  bassChannel.volume.rampTo(bassBaseVolume + transitionIntensity * 1.5, 0.05);
}

export function setBassPan(pan) {
  requireAudio();
  bassChannel.pan.rampTo(clamp(pan, -1, 1), 0.05);
}

export function setBassCutoff(frequency) {
  requireAudio();
  bassFilter.frequency.rampTo(clamp(frequency, 20, 20000), 0.05);
}

export function setBassResonance(resonance) {
  requireAudio();
  bassFilter.Q.rampTo(clamp(resonance, 0, 30), 0.05);
}

export function setBassDistortion(amount) {
  requireAudio();
  const quantizedAmount = Math.round(clamp(amount, 0, 1) * 40) / 40;
  if (quantizedAmount === lastBassDistortion) return;
  lastBassDistortion = quantizedAmount;
  bassDistortion.distortion = quantizedAmount;
}

export function setBassPortamento(seconds) {
  requireAudio();
  const portamento = clamp(seconds, 0, 2);
  bassSynth.portamento = portamento;
  manualBassSynth.portamento = Math.min(portamento, 0.25);
}

export function setBassWaveform(type) {
  requireAudio();
  assertWaveform(type);
  bassSynth.set({ oscillator: { type } });
  manualBassSynth.set({ oscillator: { type } });
  return type;
}

export function setBassPhaserWet(amount) {
  requireAudio();
  bassPhaser.wet.rampTo(clamp(amount, 0, 1), 0.08);
}

export function setBassDelayWet(amount) {
  requireAudio();
  bassDelay.wet.rampTo(clamp(amount, 0, 1), 0.08);
}

export function setBassReverbWet(amount) {
  requireAudio();
  bassReverb.wet.rampTo(clamp(amount, 0, 1), 0.08);
}

export function setPadVolume(decibels) {
  requireAudio();
  padBaseVolume = clamp(decibels, -60, 12);
  updatePadMix(0.05);
}

export function setPadPan(pan) {
  requireAudio();
  padChannel.pan.rampTo(clamp(pan, -1, 1), 0.05);
}

export function setPadWaveform(type) {
  requireAudio();
  assertWaveform(type);
  padSynth.set({ oscillator: { type } });
  return type;
}

export function setPadAttack(seconds) {
  requireAudio();
  padSynth.set({ envelope: { attack: clamp(seconds, 0.001, 10) } });
}

export function setPadRelease(seconds) {
  requireAudio();
  padSynth.set({ envelope: { release: clamp(seconds, 0.01, 20) } });
}

export function setPadChorusWet(amount) {
  requireAudio();
  padChorus.wet.rampTo(clamp(amount, 0, 1), 0.05);
}

export function setPadChorusDepth(amount) {
  requireAudio();
  padChorus.depth = clamp(amount, 0, 1);
}

export function setPadTremoloWet(amount) {
  requireAudio();
  padTremolo.wet.rampTo(clamp(amount, 0, 1), 0.08);
}

export function setPadDelayWet(amount) {
  requireAudio();
  padDelay.wet.rampTo(clamp(amount, 0, 1), 0.05);
}

export function setPadReverbWet(amount) {
  requireAudio();
  padReverb.wet.rampTo(clamp(amount, 0, 1), 0.05);
}

export function setPadReverbDecay(seconds) {
  requireAudio();
  const decay = clamp(seconds, 0.5, 12);
  if (Math.abs(padReverb.decay - decay) < 0.01) return;
  padReverb.decay = decay;
  void padReverb.generate();
}

export function setTransitionIntensity(value) {
  requireAudio();
  transitionIntensity = clamp(value, 0, 1);

  const bassCutoff = 240 + transitionIntensity * 1260;
  const distortion = 0.2 + transitionIntensity * 0.55;
  bassFilter.frequency.rampTo(bassCutoff, 0.8);
  setBassDistortion(distortion);
  bassChannel.volume.rampTo(bassBaseVolume + transitionIntensity * 1.5, 0.8);

  updateCatharsisMix(transitionIntensity, 0.8);
  padToneFilter.frequency.rampTo(1400 + transitionIntensity * 5000, 1.2);
  padChorus.depth = 0.25 + transitionIntensity * 0.65;
  updatePadMix(0.8);

  return transitionIntensity;
}

export function triggerBuriedSwell() {
  requireAudio();
  if (Tone.Transport.state !== "started") Tone.Transport.start();
  if (!pulseLoopEnabled) togglePulseLoop(true);

  const swellDuration = Tone.Time("1m").toSeconds();
  transitionIntensity = 1;
  lastPadNotes = [...PAD_CHORDS.Am];
  bassSynth.triggerAttackRelease("E1", "1m", undefined, 1);
  bassFilter.frequency.rampTo(1500, swellDuration);
  bassChannel.volume.rampTo(Math.min(3, bassBaseVolume + 2), swellDuration);
  updateCatharsisMix(1, swellDuration);
  padToneFilter.frequency.rampTo(6400, swellDuration);
  updatePadMix(swellDuration);
  setBassDistortion(0.75);
  if (buriedSwellEventId !== null) Tone.Transport.clear(buriedSwellEventId);
  if (buriedBassStartTime !== null) bassSequence.cancel(buriedBassStartTime);
  if (buriedPadStartTime !== null) padSequence.cancel(buriedPadStartTime);
  const dropTransportTime = Tone.Transport.seconds + swellDuration;
  if (!bassLoopEnabled) {
    buriedBassStartTime = dropTransportTime;
    bassSequence.start(dropTransportTime);
  }
  if (!padLoopEnabled) {
    buriedPadStartTime = dropTransportTime;
    padSequence.start(dropTransportTime);
  }
  buriedSwellEventId = Tone.Transport.scheduleOnce((time) => {
    if (buriedBassStartTime !== null) {
      bassLoopEnabled = true;
      buriedBassStartTime = null;
    }
    if (buriedPadStartTime !== null) {
      padLoopEnabled = true;
      buriedPadStartTime = null;
    }
    buriedSwellEventId = null;
    Tone.Draw.schedule(notifyLoopState, time);
  }, dropTransportTime);
  return swellDuration;
}

export function triggerDropToSilence() {
  requireAudio();
  const position = Tone.Transport.position;
  const tailNotes = [...lastPadNotes];
  if (buriedBassStartTime !== null) {
    bassSequence.cancel(buriedBassStartTime);
    buriedBassStartTime = null;
  }
  if (buriedPadStartTime !== null) {
    padSequence.cancel(buriedPadStartTime);
    buriedPadStartTime = null;
  }
  pulseSequence.stop(position);
  bassSequence.stop(position);
  padSequence.stop(position);
  if (buriedSwellEventId !== null) {
    Tone.Transport.clear(buriedSwellEventId);
    buriedSwellEventId = null;
  }
  pulseLoopEnabled = false;
  bassLoopEnabled = false;
  padLoopEnabled = false;

  marchTomGain.gain.rampTo(0, 0.03);
  guitarStrumGain.gain.rampTo(0, 0.03);
  strumNoiseGain.gain.rampTo(0, 0.03);
  catharsisRimGain.gain.rampTo(0, 0.03);
  bassSynth.triggerRelease();
  manualBassSynth.triggerRelease();
  heartbeatSynth.triggerRelease();
  heldPadNoteCounts.clear();
  updatePadMix(0.03);
  padSynth.releaseAll();
  bowedHighSynth.releaseAll();
  padSynth.triggerAttackRelease(tailNotes, "32n", undefined, 0.62);
  bowedHighSynth.triggerAttackRelease(
    tailNotes.map((note) => Tone.Frequency(note).transpose(12).toNote()),
    "32n",
    undefined,
    0.55,
  );
  Tone.Transport.pause();
  notifyLoopState();

  return { pulseLoopEnabled, bassLoopEnabled, padLoopEnabled };
}

export function stopAllAudio() {
  requireAudio();
  const position = Tone.Transport.position;
  pulseSequence.stop(position);
  bassSequence.stop(position);
  padSequence.stop(position);
  pulseLoopEnabled = false;
  bassLoopEnabled = false;
  padLoopEnabled = false;
  bassSynth.triggerRelease();
  manualBassSynth.triggerRelease();
  padSynth.releaseAll();
  bowedHighSynth.releaseAll();
  guitarStrumSynth.releaseAll();
  marchTomSynth.releaseAll();
  heartbeatSynth.triggerRelease();
  shakerSynth.triggerRelease();
  strumNoiseSynth.triggerRelease();
  catharsisRimSnare.noise.triggerRelease();
  catharsisRimSnare.body.triggerRelease();
  heldPadNoteCounts.clear();
  Tone.Transport.pause();
  notifyLoopState();
}

export function setBpm(bpm) {
  requireAudio();
  Tone.Transport.bpm.rampTo(clamp(bpm, 20, 300), 0.1);
}

export function toggleTransport(forceEnabled) {
  requireAudio();
  const shouldRun =
    typeof forceEnabled === "boolean" ? forceEnabled : Tone.Transport.state !== "started";

  if (shouldRun) {
    Tone.Transport.start();
  } else {
    Tone.Transport.pause();
  }

  return shouldRun;
}

function setSequenceEnabled(sequence, currentlyEnabled, forceEnabled) {
  const shouldEnable =
    typeof forceEnabled === "boolean" ? forceEnabled : !currentlyEnabled;
  const transportPosition = Tone.Transport.position;

  if (shouldEnable) {
    // Remove stale start/stop markers from a previous pause. Otherwise a stop
    // and a new start at the same Transport position can leave Tone.Event held.
    sequence.cancel(0);
    sequence.start(transportPosition);
  } else {
    sequence.stop(transportPosition);
  }

  return shouldEnable;
}

export function togglePulseLoop(forceEnabled) {
  requireAudio();
  pulseLoopEnabled = setSequenceEnabled(pulseSequence, pulseLoopEnabled, forceEnabled);
  notifyLoopState();
  return pulseLoopEnabled;
}

export function toggleBassLoop(forceEnabled) {
  requireAudio();
  if (buriedBassStartTime !== null) {
    bassSequence.cancel(buriedBassStartTime);
    buriedBassStartTime = null;
  }
  bassLoopEnabled = setSequenceEnabled(bassSequence, bassLoopEnabled, forceEnabled);
  notifyLoopState();
  return bassLoopEnabled;
}

export function togglePadLoop(forceEnabled) {
  requireAudio();
  if (buriedPadStartTime !== null) {
    padSequence.cancel(buriedPadStartTime);
    buriedPadStartTime = null;
  }
  padLoopEnabled = setSequenceEnabled(padSequence, padLoopEnabled, forceEnabled);
  notifyLoopState();
  return padLoopEnabled;
}

export function setPulseStep(stepIndex, enabled) {
  assertStepIndex(stepIndex, pulsePattern.length, "Pulse step index");
  pulsePattern[stepIndex] = enabled ? 1 : 0;
  return pulsePattern[stepIndex];
}

export function getPulsePattern() {
  return [...pulsePattern];
}

export function setBassStepNote(stepIndex, noteName) {
  assertStepIndex(stepIndex, bassNotes.length, "Bass step index");
  assertNote(noteName, "Bass note");
  bassNotes[stepIndex] = noteName;
  return bassNotes[stepIndex];
}

export function setBassStepEnabled(stepIndex, enabled) {
  assertStepIndex(stepIndex, bassStepEnabled.length, "Bass step index");
  bassStepEnabled[stepIndex] = Boolean(enabled);
  return bassStepEnabled[stepIndex];
}

export function setPadStepChord(stepIndex, chordName) {
  assertStepIndex(stepIndex, padStepChords.length, "Pad step index");
  if (!Object.hasOwn(PAD_CHORDS, chordName)) {
    throw new RangeError(`Unknown pad chord: ${chordName}.`);
  }
  padStepChords[stepIndex] = chordName;
  return padStepChords[stepIndex];
}

export function setPadStepEnabled(stepIndex, enabled) {
  assertStepIndex(stepIndex, padStepEnabled.length, "Pad step index");
  padStepEnabled[stepIndex] = Boolean(enabled);
  return padStepEnabled[stepIndex];
}

export function getBassStepNotes() {
  return [...bassNotes];
}

export function triggerBassAttackRelease(note, duration = "8n") {
  requireAudio();
  assertNote(note, "Bass note");
  manualBassSynth.triggerAttackRelease(note, duration, undefined, 0.76);
}

export function setPadChord(chordName, notes) {
  if (typeof chordName !== "string" || chordName.trim() === "") {
    throw new TypeError("Chord name must be a non-empty string.");
  }
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new TypeError("Chord notes must be a non-empty array.");
  }
  notes.forEach((note) => assertNote(note, "Chord note"));
  padChords[chordName] = [...notes];
  return [...padChords[chordName]];
}

export function triggerPadChord(chordName, duration = "1m") {
  requireAudio();
  const notes = padChords[chordName];
  if (!notes) throw new RangeError(`Unknown pad chord: ${chordName}.`);
  lastPadNotes = [...notes];
  padSynth.triggerAttackRelease(notes, duration);
  if (transitionIntensity > 0.55) {
    bowedHighSynth.triggerAttackRelease(octaveUp(notes), duration, undefined, 0.5);
  }
}

export function triggerPadAttack(notes, velocity = 0.85) {
  requireAudio();
  const noteList = Array.isArray(notes) ? notes : [notes];
  noteList.forEach((note) => assertNote(note, "Pad note"));
  const notesToAttack = [];

  noteList.forEach((note) => {
    const holdCount = heldPadNoteCounts.get(note) ?? 0;
    heldPadNoteCounts.set(note, holdCount + 1);
    if (holdCount === 0) notesToAttack.push(note);
  });
  updatePadMix(0.06);

  // The automatic strum follows the most recently played voicing. Keeping all
  // held notes here would turn overlapping chords into a very expensive 9–12
  // note strum on every sixteenth step.
  lastPadNotes = [...noteList];
  if (notesToAttack.length === 0) return;

  padSynth.triggerAttack(notesToAttack, undefined, clamp(velocity, 0, 1));
  if (transitionIntensity > 0.55) {
    bowedHighSynth.triggerAttack(
      octaveUp(notesToAttack.slice(0, 3)),
      undefined,
      clamp(velocity * 0.72, 0, 1),
    );
  }
}

export function triggerPadRelease(notes) {
  requireAudio();
  const noteList = Array.isArray(notes) ? notes : [notes];
  noteList.forEach((note) => assertNote(note, "Pad note"));
  const notesToRelease = [];

  noteList.forEach((note) => {
    const holdCount = heldPadNoteCounts.get(note) ?? 0;
    if (holdCount <= 1) {
      heldPadNoteCounts.delete(note);
      if (holdCount === 1) notesToRelease.push(note);
    } else {
      heldPadNoteCounts.set(note, holdCount - 1);
    }
  });
  updatePadMix(0.1);

  if (heldPadNoteCounts.size > 0 && noteList.some((note) => lastPadNotes.includes(note))) {
    lastPadNotes = [...heldPadNoteCounts.keys()].slice(0, 4);
  }
  if (notesToRelease.length === 0) return;

  padSynth.triggerRelease(notesToRelease);
  bowedHighSynth.triggerRelease(octaveUp(notesToRelease));
}

export function releaseAllPadNotes() {
  if (!initialized) {
    heldPadNoteCounts.clear();
    return;
  }
  heldPadNoteCounts.clear();
  lastPadNotes = [...PAD_CHORDS.Am];
  updatePadMix(0.08);
  padSynth.releaseAll();
  bowedHighSynth.releaseAll();
}

export function subscribePulseStep(listener) {
  if (typeof listener !== "function") throw new TypeError("Pulse listener must be a function.");
  pulseStepListeners.add(listener);
  return () => pulseStepListeners.delete(listener);
}

export function subscribeBassStep(listener) {
  if (typeof listener !== "function") throw new TypeError("Bass listener must be a function.");
  bassStepListeners.add(listener);
  return () => bassStepListeners.delete(listener);
}

export function subscribePadStep(listener) {
  if (typeof listener !== "function") throw new TypeError("Pad listener must be a function.");
  padStepListeners.add(listener);
  return () => padStepListeners.delete(listener);
}

export function subscribeLoopState(listener) {
  if (typeof listener !== "function") throw new TypeError("Loop state listener must be a function.");
  loopStateListeners.add(listener);
  return () => loopStateListeners.delete(listener);
}

export function getPadChords() {
  return Object.fromEntries(
    Object.entries(padChords).map(([name, notes]) => [name, [...notes]]),
  );
}

export function getWaveformValues() {
  if (!initialized || !waveform) return new Float32Array(128);
  return waveform.getValue();
}

export function getAudioState() {
  return {
    initialized,
    transportState: Tone.Transport.state,
    bpm: Tone.Transport.bpm.value,
    pulseLoopEnabled,
    bassLoopEnabled,
    padLoopEnabled,
    transitionIntensity,
  };
}

const synthEngine = Object.freeze({
  initAudio,
  setBassVolume,
  setBassPan,
  setBassCutoff,
  setBassResonance,
  setBassDistortion,
  setBassPortamento,
  setBassWaveform,
  setBassPhaserWet,
  setBassDelayWet,
  setBassReverbWet,
  setPadVolume,
  setPadPan,
  setPadWaveform,
  setPadAttack,
  setPadRelease,
  setPadChorusWet,
  setPadChorusDepth,
  setPadTremoloWet,
  setPadDelayWet,
  setPadReverbWet,
  setPadReverbDecay,
  setTransitionIntensity,
  triggerBuriedSwell,
  triggerDropToSilence,
  stopAllAudio,
  setBpm,
  toggleTransport,
  togglePulseLoop,
  toggleBassLoop,
  togglePadLoop,
  setPulseStep,
  getPulsePattern,
  setBassStepNote,
  setBassStepEnabled,
  setPadStepChord,
  setPadStepEnabled,
  getBassStepNotes,
  triggerBassAttackRelease,
  setPadChord,
  triggerPadChord,
  triggerPadAttack,
  triggerPadRelease,
  releaseAllPadNotes,
  subscribePulseStep,
  subscribeBassStep,
  subscribePadStep,
  subscribeLoopState,
  getPadChords,
  getWaveformValues,
  getAudioState,
  PAD_CHORDS,
});

export default synthEngine;

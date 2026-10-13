const MIN_SLIDER_Y = 12;
const MAX_SLIDER_Y = 128;
const pressedKeys = new Set();
const activePointers = new Map();
const keyTargets = new Map(
  [...document.querySelectorAll("[data-key]")].map((element) => [element.dataset.key, element])
);
const drums = document.querySelector(".drums");
const drumsLeft = document.querySelector(".drums__left");
const drumsRight = document.querySelector(".drums__right");
const sliders = [...document.querySelectorAll(".slider")];

let audioReady = false;
let audioStarting = null;
let stringVoices = [];
let lowDrum;
let deepCymbal;
let contrabass;
let contrabassSub;
let thunder;
let tempoIndex = 2;
const tempoSteps = [42, 54, 68, 84, 104, 128];

const stringPatterns = [
  ["E6", null, "B6", "G6", null, "E7", "B6", null, "E6", "G6", null, "B6", "D7", null, "B6", "G6"],
  [null, "B5", null, "D6", "F#6", null, "A6", null, "B5", null, "D6", null, "F#6", "A6", null, "D6"],
  ["G5", null, null, "A5", null, "C6", null, "E6", "D6", null, "C6", null, "A5", null, "G5", null],
  [null, "E4", "B4", null, "G4", null, "E5", null, null, "B4", null, "D5", "E5", null, "D5", "B4"]
];

const stringOscillators = ["fatsine", "fattriangle", "fatsawtooth", "fatsquare"];

function sliderLevel(value) {
  const normalized = 1 - (value - MIN_SLIDER_Y) / (MAX_SLIDER_Y - MIN_SLIDER_Y);
  return Math.max(0, Math.min(1, normalized));
}

function updateStringVolume(slider) {
  if (!audioReady) return;
  const index = sliders.indexOf(slider);
  const voice = stringVoices[index];
  if (!voice) return;
  const level = sliderLevel(Number(slider.dataset.value));
  voice.gain.gain.rampTo(level * level * 0.24, 0.08);
}

function setTempo(nextIndex) {
  tempoIndex = Math.max(0, Math.min(tempoSteps.length - 1, nextIndex));
  if (audioReady) Tone.Transport.bpm.rampTo(tempoSteps[tempoIndex], 0.25);
}

async function ensureAudio() {
  if (audioReady) return;
  if (audioStarting) return audioStarting;
  audioStarting = (async () => {
    if (!window.Tone) throw new Error("Tone.js не загрузился");
    await Tone.start();

    const limiter = new Tone.Limiter(-2).toDestination();
    const master = new Tone.Compressor(-20, 3).connect(limiter);
    const room = new Tone.Reverb({ decay: 4.5, preDelay: 0.08, wet: 0.34 }).connect(master);
    const stringBus = new Tone.Filter(4200, "lowpass").connect(room);
    const chorus = new Tone.Chorus(1.6, 2.8, 0.22).connect(stringBus).start();

    stringVoices = stringPatterns.map((pattern, index) => {
      const gain = new Tone.Gain(0).connect(chorus);
      const toneFilter = new Tone.Filter(6200 - index * 900, "lowpass").connect(gain);
      const synth = new Tone.Synth({
        oscillator: { type: stringOscillators[index], count: 2 + index, spread: 8 + index * 7 },
        envelope: { attack: 0.035 + index * 0.035, decay: 0.16 + index * 0.06, sustain: 0.24 + index * 0.07, release: 0.55 + index * 0.2 },
        volume: -9 - index
      }).connect(toneFilter);
      const sequence = new Tone.Sequence((time, note) => {
        if (note) synth.triggerAttackRelease(note, "8n", time, 0.72);
      }, pattern, "8n").start(0);
      return { synth, gain, sequence, toneFilter };
    });

    const drumPan = new Tone.Panner(-0.68).connect(master);
    const drumBus = new Tone.Gain(1.4).connect(drumPan);
    lowDrum = new Tone.MembraneSynth({
      pitchDecay: 0.12,
      octaves: 4.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.82, sustain: 0.035, release: 1.25 },
      volume: 1
    }).connect(drumBus);

    const cymbalPan = new Tone.Panner(-0.78).connect(room);
    const cymbalBus = new Tone.Filter(980, "lowpass").connect(cymbalPan);
    const cymbalNoise = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.004, decay: 0.86, sustain: 0.03, release: 0.18 },
      volume: -5
    }).connect(cymbalBus);
    const cymbalBody = new Tone.MembraneSynth({
      pitchDecay: 0.24,
      octaves: 2.2,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.002, decay: 0.72, sustain: 0, release: 0.3 },
      volume: -3
    }).connect(room);
    deepCymbal = { noise: cymbalNoise, body: cymbalBody };

    const bassPan = new Tone.Panner(0.58).connect(master);
    const bassGain = new Tone.Gain(1.85).connect(bassPan);
    const bassDrive = new Tone.Distortion({ distortion: 0.16, wet: 0.26 }).connect(bassGain);
    contrabass = new Tone.MonoSynth({
      oscillator: { type: "fattriangle", count: 3, spread: 7 },
      filter: { type: "lowpass", frequency: 460, rolloff: -24, Q: 1.25 },
      envelope: { attack: 0.012, decay: 0.5, sustain: 0.78, release: 1.05 },
      filterEnvelope: { attack: 0.025, decay: 0.48, sustain: 0.24, release: 0.85, baseFrequency: 48, octaves: 2.8 },
      volume: 4
    }).connect(bassDrive);
    contrabassSub = new Tone.MembraneSynth({
      pitchDecay: 0.24,
      octaves: 2.1,
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, decay: 1.05, sustain: 0.14, release: 1.15 },
      volume: 2
    }).connect(bassGain);

    const thunderFilter = new Tone.Filter(310, "lowpass").connect(room);
    const thunderNoise = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.12, decay: 2.7, sustain: 0.04, release: 1.4 },
      volume: -18
    }).connect(thunderFilter);
    const thunderBody = new Tone.MembraneSynth({
      pitchDecay: 0.8,
      octaves: 1.6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.04, decay: 1.8, sustain: 0.01, release: 1.2 },
      volume: -20
    }).connect(room);
    const thunderLoop = new Tone.Loop((time) => {
      const velocity = 0.34 + Math.random() * 0.14;
      thunderNoise.triggerAttackRelease("2n", time, velocity);
      thunderBody.triggerAttackRelease("C1", "2n", time + 0.08, velocity + 0.08);
    }, "4m").start("2m");
    thunder = { noise: thunderNoise, body: thunderBody, loop: thunderLoop };

    Tone.Transport.bpm.value = tempoSteps[tempoIndex];
    audioReady = true;
    sliders.forEach(updateStringVolume);
    Tone.Transport.start("+0.05");
  })().catch((error) => {
    audioStarting = null;
    console.error(error);
  });
  return audioStarting;
}

function playDrum(time = Tone.now(), velocity = 0.98) {
  lowDrum.triggerAttackRelease("C1", "4n", time, velocity);
}

function playCymbal(time = Tone.now(), velocity = 0.9) {
  deepCymbal.noise.triggerAttackRelease(1, time, velocity);
  deepCymbal.body.triggerAttackRelease("F1", "2n", time, Math.min(1, velocity + 0.08));
}

function playContrabassHit() {
  const now = Tone.now();
  contrabass.triggerAttackRelease("E1", 1.65, now, 1);
  contrabassSub.triggerAttackRelease("E1", 1.25, now, 1);
}

async function triggerSound(code) {
  await ensureAudio();
  if (!audioReady) return;
  if (code === "Digit5") setTempo(tempoIndex - 1);
  if (code === "Digit6") setTempo(tempoIndex + 1);
  if (code === "Digit7") playCymbal();
  if (code === "Digit8") playDrum();
  if (code === "Digit9") playContrabassHit();
}

async function removeConnectedGrayBackground(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  const visited = new Uint8Array(canvas.width * canvas.height);
  const stack = [];
  const enqueue = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    stack.push(index);
  };
  const seed = (x, y) => enqueue(y * canvas.width + x);
  for (let x = 0; x < canvas.width; x += 2) {
    seed(x, 0);
    seed(x, canvas.height - 1);
  }
  for (let y = 0; y < canvas.height; y += 2) {
    seed(0, y);
    seed(canvas.width - 1, y);
  }
  const background = [data[0], data[1], data[2]];
  while (stack.length) {
    const index = stack.pop();
    const offset = index * 4;
    const distance = Math.hypot(
      data[offset] - background[0],
      data[offset + 1] - background[1],
      data[offset + 2] - background[2]
    );
    if (distance > 14) continue;
    data[offset + 3] = 0;
    const x = index % canvas.width;
    const y = Math.floor(index / canvas.width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < canvas.width) enqueue(index + 1);
    if (y > 0) enqueue(index - canvas.width);
    if (y + 1 < canvas.height) enqueue(index + canvas.width);
  }
  context.putImageData(pixels, 0, 0);
  image.src = canvas.toDataURL("image/png");
  await image.decode().catch(() => {});
}

let isRevealed = false;

function revealPage() {
  if (isRevealed) return;
  isRevealed = true;
  requestAnimationFrame(() => document.documentElement.classList.remove("is-loading"));
}

async function revealWhenAssetsAreReady() {
  try {
    await removeConnectedGrayBackground(document.querySelector(".piano"));
  } finally {
    revealPage();
  }
}

setTimeout(revealPage, 2500);

if (document.readyState === "complete") {
  revealWhenAssetsAreReady();
} else {
  window.addEventListener("load", () => revealWhenAssetsAreReady(), { once: true });
}

function setInstrumentState(element, active) {
  if (!element) return;
  if (element.closest(".drums")) {
    const image = element.dataset.key === "Digit7" ? drumsRight : drumsLeft;
    const otherImage = image === drumsLeft ? drumsRight : drumsLeft;
    if (active) otherImage.classList.remove("is-active");
    image.classList.toggle("is-active", active);
    drums.classList.toggle("is-active", drumsLeft.classList.contains("is-active") || drumsRight.classList.contains("is-active"));
    return;
  }
  element.classList.toggle("is-active", active);
}

function setSliderValue(slider, value, dragging = false) {
  const clamped = Math.min(MAX_SLIDER_Y, Math.max(MIN_SLIDER_Y, value));
  slider.style.setProperty("--value", String(clamped / 188 * 100));
  slider.dataset.value = String(clamped);
  slider.classList.toggle("is-dragging", dragging);
  updateStringVolume(slider);
}

function sliderValueFromPointer(slider, clientY) {
  const rect = slider.getBoundingClientRect();
  const thumbHeight = rect.width * (48 / 38);
  const scale = 188 / rect.height;
  return (clientY - rect.top - thumbHeight / 2) * scale;
}

document.querySelectorAll(".slider").forEach((slider) => {
  slider.tabIndex = 0;
  setSliderValue(slider, Number.parseFloat(slider.style.getPropertyValue("--rest")));
  slider.addEventListener("pointerdown", async (event) => {
    event.preventDefault();
    slider.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, slider);
    setSliderValue(slider, sliderValueFromPointer(slider, event.clientY), true);
    await ensureAudio();
    updateStringVolume(slider);
  });
  slider.addEventListener("pointermove", (event) => {
    if (activePointers.get(event.pointerId) !== slider) return;
    setSliderValue(slider, sliderValueFromPointer(slider, event.clientY), true);
  });
  const endDrag = (event) => {
    if (activePointers.get(event.pointerId) !== slider) return;
    activePointers.delete(event.pointerId);
    slider.classList.remove("is-dragging");
  };
  slider.addEventListener("pointerup", endDrag);
  slider.addEventListener("pointercancel", endDrag);
});

document.querySelectorAll(".instrument[data-key], .hit[data-key]").forEach((element) => {
  element.addEventListener("pointerdown", async (event) => {
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, element);
    setInstrumentState(element, true);
    await triggerSound(element.dataset.key);
  });
  const release = (event) => {
    if (activePointers.get(event.pointerId) !== element) return;
    activePointers.delete(event.pointerId);
    setInstrumentState(element, false);
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("lostpointercapture", release);
});

window.addEventListener("keydown", async (event) => {
  const target = keyTargets.get(event.code);
  if (!target || event.metaKey || event.ctrlKey || event.altKey) return;
  event.preventDefault();
  if (pressedKeys.has(event.code)) return;
  pressedKeys.add(event.code);
  if (target.classList.contains("slider")) {
    await ensureAudio();
    const current = Number(target.dataset.value);
    const step = (MAX_SLIDER_Y - MIN_SLIDER_Y) / 4;
    const next = current <= MIN_SLIDER_Y + 1 ? MAX_SLIDER_Y : Math.max(MIN_SLIDER_Y, current - step);
    setSliderValue(target, next);
  } else {
    setInstrumentState(target, true);
    await triggerSound(event.code);
  }
});

window.addEventListener("keyup", (event) => {
  const target = keyTargets.get(event.code);
  if (!target) return;
  pressedKeys.delete(event.code);
  if (!target.classList.contains("slider")) {
    setInstrumentState(target, false);
  }
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
  activePointers.clear();
  document.querySelectorAll(".is-active").forEach((element) => element.classList.remove("is-active"));
  document.querySelectorAll(".slider").forEach((slider) => slider.classList.remove("is-dragging"));
});

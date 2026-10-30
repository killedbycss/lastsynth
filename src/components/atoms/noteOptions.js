const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export const BASS_NOTE_OPTIONS = [1, 2].flatMap((octave) =>
  NOTE_NAMES.map((note) => `${note}${octave}`),
)

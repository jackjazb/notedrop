import * as Tone from "tone";

export const Instruments = ["marimba", "guitar"] as const;
export type Instrument = (typeof Instruments)[number];

const Octaves = [3, 4, 5];

export const Notes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
export type Note = (typeof Notes)[number];

export const Scales = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 11],
  pentatonic_major: [0, 2, 4, 7, 9],
  pentatonic_minor: [0, 3, 5, 7, 10],
} as const;

/**
 * Returns a sampler pointing at the passed folder in samples/
 */
function buildSampler(instrument: Instrument) {
  const limiter = new Tone.Limiter(-40);
  const mono = new Tone.Mono();

  return new Tone.Sampler({
    urls: {
      C2: "c2.mp3",
      C3: "c3.mp3",
      C4: "c4.mp3",
      C5: "c5.mp3",
    },
    attack: 0.1,
    baseUrl: `samples/${instrument}/`,
    volume: -10,
  })
    .connect(limiter)
    .connect(mono)
    .toDestination();
}
export type ScaleType = keyof typeof Scales;

export class NoteSampler {
  instrument: Instrument = "marimba";

  // Scale data.
  private root: Note = "C";
  private scaleType: ScaleType = "major";
  private scale: string[] = [];

  // ToneJS
  private ready = false;
  private samplers: Record<Instrument, Tone.Sampler>;

  constructor() {
    Tone.getContext().lookAhead = 0;

    this.samplers = {
      guitar: buildSampler("guitar"),
      marimba: buildSampler("marimba"),
    };
    this.updateScale();
  }
  /**
   * Initialise audio if it isn't already.
   */
  async init() {
    if (!this.ready) {
      try {
        await Tone.start();
        await Tone.loaded();
        this.ready = true;
      } catch {
        return;
      }
    }
  }

  play(speed: number) {
    // Doing this as a fraction of G seems to work well.
    const min = 0;
    const max = 2.0;
    const step = (max - min) / (this.scale.length - 1);

    // Clamp between min and max speed, then normalise 0 to max.
    const resolved = Math.max(min, Math.min(speed, max)) - min;

    const note = Math.floor(resolved / step);
    this.samplers[this.instrument].triggerAttackRelease(
      this.scale[note],
      1,
      "+0.05"
    );
  }

  getRootNote() {
    return this.root;
  }
  setRootNote(root: Note) {
    this.root = root;
    this.updateScale();
  }

  getScaleType() {
    return this.scaleType;
  }
  setScaleType(type: ScaleType) {
    this.scaleType = type;
    this.updateScale();
  }

  private updateScale() {
    const rootIndex = Notes.indexOf(this.root);
    if (rootIndex === -1) {
      throw new Error(`invalid root: ${this.root}`);
    }

    const offsets = Scales[this.scaleType];
    const scale: string[] = [];
    for (const offset of offsets) {
      let i = rootIndex + offset;
      if (i >= Notes.length) {
        i -= Notes.length;
      }
      scale.push(Notes[i]);
    }
    this.scale = Octaves.flatMap((o) => scale.map((note) => `${note}${o}`));
  }
}

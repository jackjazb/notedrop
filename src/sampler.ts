import * as Tone from "tone";

// TODO IoC this, make calls functional and store note state in State.
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
function buildSampler(instrument: Instrument, output: Tone.ToneAudioNode) {
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
    .connect(output);
}
export type ScaleType = keyof typeof Scales;

export class NoteSampler {
  // ToneJS
  private ready = false;
  private samplers: Record<Instrument, Tone.Sampler>;
  private output = new Tone.Gain();
  constructor() {
    Tone.getContext().lookAhead = 0;

    this.samplers = {
      guitar: buildSampler("guitar", this.output),
      marimba: buildSampler("marimba", this.output),
    };

    this.output.toDestination();
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

  play(
    speed: number,
    instrument: Instrument,
    root: Note,
    scaleType: ScaleType
  ) {
    const scale = this.getScale(root, scaleType);
    // Doing this as a fraction of G seems to work well.
    const min = 0;
    const max = 2.0;
    const step = (max - min) / (scale.length - 1);

    // Clamp between min and max speed, then normalise 0 to max.
    const resolved = Math.max(min, Math.min(speed, max)) - min;

    const note = Math.floor(resolved / step);
    this.samplers[instrument].triggerAttackRelease(scale[note], 1, "+0.05");
  }

  mute(toggle: boolean) {
    if (toggle) {
      this.output.gain.rampTo(0);
    } else {
      this.output.gain.rampTo(1);
    }
  }

  private getScale(root: Note, type: ScaleType): string[] {
    const rootIndex = Notes.indexOf(root);
    if (rootIndex === -1) {
      throw new Error(`invalid root: ${root}`);
    }

    const offsets = Scales[type];
    const scale: string[] = [];
    for (const offset of offsets) {
      let i = rootIndex + offset;
      if (i >= Notes.length) {
        i -= Notes.length;
      }
      scale.push(Notes[i]);
    }
    return Octaves.flatMap((o) => scale.map((note) => `${note}${o}`));
  }
}

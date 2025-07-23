import * as Tone from 'tone';

export type Instrument = 'marimba';

const Octaves = [3, 4, 5];

const Notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
type Note = typeof Notes[number];

type ScaleType = "major" | "minor";

const Intervals: Record<ScaleType, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 11]
};

export class NoteSampler {
  private ready = false;
  private instrument: Instrument = 'marimba';
  private sampler: Tone.Sampler;

  private scale: string[] = [];

  constructor() {
    const limiter = new Tone.Limiter(-40).toDestination();

    this.sampler = new Tone.Sampler({
      urls: {
        C3: "c3.wav",
        C4: "c4.wav",
      },
      release: 0.2,
      baseUrl: `samples/${this.instrument}/`,
      volume: -20,
    }).connect(limiter).toDestination();
    this.setScale("C", "major");
  }
  /**
   * Initialise audio if it isn't already.
   */
  async init() {
    if (!this.ready) {
      await Tone.start();
      await Tone.loaded();
      this.ready = true;
    }
  }

  play(speed: number, gravity: number) {
    // Doing this as a fraction of G seems to work well.
    const min = gravity * 0.8;
    const max = gravity * 1.2;
    const step = (max - min) / (this.scale.length - 1);

    // Clamp between min and max speed, then normalise 0 to max.
    const resolved = Math.max(min, Math.min(speed, max)) - min;

    const note = Math.floor(resolved / step);
    this.sampler.triggerAttackRelease(this.scale[note], 1);
  }

  setScale(root: Note, type: ScaleType) {
    const rootIndex = Notes.indexOf(root);
    if (rootIndex === -1) {
      throw new Error(`invalid root: ${root}`);
    }

    let offsets = Intervals[type];
    const scale: string[] = [];
    for (const offset of offsets) {
      let i = rootIndex + offset;
      if (i >= Notes.length) {
        i -= Notes.length;
      }
      scale.push(Notes[i]);
    }
    this.scale = Octaves.flatMap(o =>
      scale.map(note => `${note}${o}`)
    );

  }
}


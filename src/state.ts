import { StaticLine, type SerialisedLine } from "./line";
import { Renderer, type Line } from "./renderer";
import {
  NoteSampler,
  type Instrument,
  type Note,
  type ScaleType,
} from "./sampler";
import { Vec, vec, type SerialisedVector } from "./vec";

type Dropper = {
  pos: Vec;
  timeout: number;
};

type SerialisedDropper = {
  pos: SerialisedVector;
  // This is stored to retain note timings.
  timeout: number;
};

type Ball = {
  pos: Vec;
  vel: Vec;
  acc: Vec;
};

export type Tool = "line" | "dropper";

/**
 * All state that represents a unique setup.
 */
export type CoreState = {
  /**
   * px/s^2
   */
  gravity: number;
  /**
   * The rate at which droppers drop
   */
  dropperTimeout: number;
  instrument: Instrument;
  root: Note;
  scaleType: ScaleType;
  lines: StaticLine[];
  droppers: Dropper[];
};

/**
 * Same as CoreState, but contains no classes, allowing it to be saved/loaded.
 */
export type SerialisedState = {
  gravity: number;
  dropperTimeout: number;
  root: Note;
  scaleType: ScaleType;
  instrument: Instrument;
  size: SerialisedVector;
  lines: SerialisedLine[];
  droppers: SerialisedDropper[];
};

/**
 * Subset of SerialisedState for the undo stack.
 * Every parameter in here needs to update the stack on change.
 */
type UndoPoint = Pick<SerialisedState, "lines" | "droppers">;

/**
 * The default settings for a new board.
 */
const DefaultSettings: Pick<
  CoreState,
  "gravity" | "dropperTimeout" | "instrument" | "root" | "scaleType"
> = {
  gravity: 1.5,
  dropperTimeout: 800,
  instrument: "marimba",
  root: "C",
  scaleType: "major",
};

/**
 * Used to get/set state in the URL.
 */
const StateKey = "state";

/**
 * Manages all state for the simulation.
 */
export class State {
  // All the parameters and data that form a unique board.
  state: CoreState = {
    ...DefaultSettings,
    lines: [],
    droppers: [],
  };

  // Video and sound.
  renderer: Renderer;
  sampler: NoteSampler;

  // Currently active balls
  balls: Ball[] = [];

  // Fixed position center dropper. Always added on clear.
  initialDropper: Dropper;

  // Interaction.
  currentLine?: Line;
  tool: Tool = "line";

  private undoStack: UndoPoint[] = [];
  private shouldUndo = false;

  constructor() {
    this.renderer = new Renderer();
    this.sampler = new NoteSampler();
    this.initialDropper = {
      pos: this.renderer
        .size()
        .divide(2)
        .minus(vec(0, this.renderer.size().y / 4)),
      timeout: 0,
    };
    this.clearBoard();
  }

  /**
   * Clears the board state, but not settings.
   */
  clearBoard() {
    this.pushUndo();
    this.balls = [];
    this.state = {
      ...this.state,
      lines: [],
      droppers: [this.initialDropper],
    };
  }

  /**
   * Resets to default settings without affecting the board
   */
  clearSettings() {
    this.state = {
      ...this.state,
      ...DefaultSettings,
    };
  }

  /**
   * Advances the simulation by the specified number of ms.
   * Unless otherwise stated, units generally deal in px and ms.
   * E.g. vel is px/ms, acc is px/ms^2 etc.
   */
  update(timeStepMs: number) {
    // Add balls to timed out droppers
    for (const d of this.state.droppers) {
      d.timeout -= timeStepMs;
      if (d.timeout > 0) {
        continue;
      }

      d.timeout = this.state.dropperTimeout;
      this.balls.push({
        pos: d.pos.clone(),
        vel: vec(0, 0),
        acc: vec(0, 0),
      });
    }

    // Convert px/s to px/ms
    const gravity = this.state.gravity / 1000;

    for (const [i, b] of this.balls.entries()) {
      // Acceleration = gravity.
      b.acc = vec(0, gravity);

      // Add acceleration normalised for frame time to current velocity.
      b.vel = b.vel.add(b.acc.times(timeStepMs));

      // Calculate the position next frame by adding frame normalised velocity to position.
      let nextPos = b.pos.add(b.vel.times(timeStepMs));

      /*
       Check each line for bounces with the current ball.
       If the dot product of (from -> ball) and the line's normal is 0, the lines are perpendicular.
       This means on each side of the line this product has a different sign,
      */
      for (const l of this.state.lines) {
        /*
         Is the ball in line with the segment of the line on show?
         Get vectors from each end and see if their alignment mismatches.
         Picture the triangle formed by the line's ends and the balls.
         If both lines point the same way relative to the line's vector, the ball is misaligned.
        */
        const fromDot = b.pos.minus(l.from).dot(l.to.minus(l.from));
        const toDot = b.pos.minus(l.to).dot(l.to.minus(l.from));
        const withinLineSegment = Math.sign(fromDot) !== Math.sign(toDot);

        const thisDot = b.pos.minus(l.from).dot(l.normal());
        const nextDot = nextPos.minus(l.from).dot(l.normal());
        const crossesLine = Math.sign(thisDot) !== Math.sign(nextDot);

        if (withinLineSegment && crossesLine) {
          b.vel = l.bounce(b.vel);
          nextPos = b.pos.add(b.vel.times(timeStepMs));
          this.sampler.play(
            b.vel.mag(),
            this.state.instrument,
            this.state.root,
            this.state.scaleType
          );
        }
      }

      // Remove anything outside the canvas post bouncing.
      if (nextPos.isOutside(vec(0, 0), this.renderer.size())) {
        this.balls.splice(i, 1);
        continue;
      }
      b.pos = nextPos;
    }

    // We don't want to undo mid frame, so this defers it until the simulation has advanced.
    if (this.shouldUndo) {
      this.popUndo();
      this.shouldUndo = false;
    }
  }

  /**
   * Renders the current state to the current canvas.
   */
  render() {
    this.renderer.clear();

    if (this.currentLine) {
      this.renderer.drawLine(this.currentLine);
    }

    for (const l of this.state.lines) {
      this.renderer.drawLine(l);
    }

    for (const d of this.state.droppers) {
      this.renderer.drawCircle({
        centre: d.pos,
        radius: 4,
        stroke: true,
      });
    }

    for (const b of this.balls) {
      this.renderer.drawCircle({
        centre: b.pos,
        radius: 4,
      });
    }
  }

  /**
   * Stores the currently held line to the lines array, e.g. when a touch ends.
   */
  addCurrentLine() {
    if (!this.currentLine) {
      return;
    }
    this.pushUndo();

    this.currentLine.to = this.currentLine.to.clamp(this.renderer.size());

    const newLine = new StaticLine(this.currentLine);
    this.state.lines.push(newLine);
    this.currentLine = undefined;
  }

  addDropper(pos: Vec) {
    this.pushUndo();
    this.state.droppers.push({ pos, timeout: 0 });
  }

  /**
   * Queues an undo for the end of the frame.
   */
  undo() {
    this.shouldUndo = true;
  }

  private pushUndo() {
    const serialised = this.serialise();
    this.undoStack.push({
      droppers: serialised.droppers,
      lines: serialised.lines,
    });
  }

  private popUndo() {
    const prev = this.undoStack.pop();
    if (!prev) {
      return;
    }
    this.state.lines = prev.lines.map((l) => StaticLine.deserialise(l));
    this.state.droppers = prev.droppers.map((d) => ({
      pos: Vec.deserialise(d.pos),
      timeout: d.timeout,
    }));
  }

  serialise(): SerialisedState {
    const { droppers, lines, ...rest } = this.state;

    return {
      ...rest,
      droppers: droppers.map((dropper) => ({
        pos: dropper.pos.serialise(),
        timeout: dropper.timeout,
      })),
      lines: lines.map((line) => line.serialise()),
      size: this.renderer.size().serialise(),
    };
  }

  deserialise(from: SerialisedState) {
    const { droppers, lines, size: _size, ...rest } = from;

    this.state = {
      ...rest,
      lines: lines.map((line) => StaticLine.deserialise(line)),
      droppers: droppers.map((dropper) => ({
        pos: Vec.deserialise(dropper.pos),
        timeout: dropper.timeout,
      })),
    };
  }

  /**
   * Saves the current state to the URL for sharing.
   */
  saveToUrl() {
    const serialised = this.serialise();
    const encoded = btoa(JSON.stringify(serialised));
    const url = new URL(window.location.href);
    url.searchParams.set(StateKey, encoded);
    window.history.pushState(null, "", url.toString());
  }

  /**
   * Loads a state from the URL if one is present.
   */
  async loadFromUrl() {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get(StateKey);
    if (!encoded) {
      return;
    }

    try {
      const decoded = atob(encoded);
      const parsed = JSON.parse(decoded) as SerialisedState;
      // Center the board if the URL was sent from a different screen size.
      const xOffset = (this.renderer.size().x - parsed.size.x) / 2;
      for (const d of parsed.droppers) {
        d.pos.x += xOffset;
      }
      for (const l of parsed.lines) {
        l.from.x += xOffset;
        l.to.x += xOffset;
      }

      this.deserialise(parsed);
    } catch {
      // This could easily happen and we don't especially care - no handling.
      return;
    }
  }
}

import { CompletedLine, type Line } from "./line";
import {
  type Ball,
  type Dropper,
  type SerialisedState,
  type SimulationParams,
  type Tool,
} from "./model";
import { Renderer } from "./renderer";
import { NoteSampler } from "./sampler";
import { Vec, vec } from "./vec";

export const DefaultSimulationSettings: SimulationParams = {
  gravity: 1.5,
  dropperTimeout: 800,
};

const StateKey = "state";

export class State {
  // Video and sound.
  renderer: Renderer;
  sampler: NoteSampler;

  /**
   * Settings for gravity etc.
   */
  sim: SimulationParams = { ...DefaultSimulationSettings };

  // Interaction.
  currentLine?: Line;
  tool: Tool = "line";

  // Core simulation state.
  lines: CompletedLine[] = [];
  droppers: Dropper[] = [];
  balls: Ball[] = [];

  undoStack: SerialisedState[] = [];
  shouldUndo = false;

  constructor() {
    this.renderer = new Renderer();
    this.sampler = new NoteSampler();
    this.clear();
  }

  clear() {
    this.lines = [];
    this.droppers = [];
    this.balls = [];
    this.droppers.push({
      pos: this.renderer.size.divide(2).minus(vec(0, this.renderer.size.y / 4)),
      timeout: 0,
    });
  }

  /**
   * Advances the simulation by the specified number of ms.
   * Unless otherwise stated, units generally deal in px and ms.
   * E.g. vel is px/ms, acc is px/ms^2 etc.
   */
  update(timeStepMs: number) {
    // Add balls to timed out droppers
    for (const d of this.droppers) {
      d.timeout -= timeStepMs;
      if (d.timeout > 0) {
        continue;
      }
      d.timeout = this.sim.dropperTimeout;
      this.balls.push({
        pos: d.pos.clone(),
        vel: vec(0, 0),
        acc: vec(0, 0),
      });
    }

    // Convert px/s to px/ms
    const gravity = this.sim.gravity / 1000;

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
      for (const l of this.lines) {
        /*
         Is the ball in line with the segment of the line on show?
         Get vectors from each end and see if their alignment mismatches.
         Picture the triangle formed by the line's ends and the balls.
         If both lines point the same way relative to the line's vector, the ball is misaligned.
        */
        const fromDot = b.pos.minus(l.from).dot(l.to.minus(l.from));
        const toDot = b.pos.minus(l.to).dot(l.to.minus(l.from));
        const withinLineSegment = Math.sign(fromDot) !== Math.sign(toDot);

        const thisDot = b.pos.minus(l.from).dot(l.normal);
        const nextDot = nextPos.minus(l.from).dot(l.normal);
        const crossesLine = Math.sign(thisDot) !== Math.sign(nextDot);

        if (withinLineSegment && crossesLine) {
          b.vel = l.bounce(b.vel);
          nextPos = b.pos.add(b.vel.times(timeStepMs));
          this.sampler.play(b.vel.mag());
        }
      }

      // Remove anything outside the canvas post bouncing.
      if (nextPos.isOutside(vec(0, 0), this.renderer.size)) {
        this.balls.splice(i, 1);
        continue;
      }
      b.pos = nextPos;
    }

    // We don't want to undo mid frame, so this defers it until the simulation has advanced.
    if (this.shouldUndo) {
      this.shouldUndo = false;
      const prev = this.undoStack.pop();
      if (!prev) {
        return;
      }
      this.load(prev);
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

    for (const l of this.lines) {
      this.renderer.drawLine(l);
    }

    for (const d of this.droppers) {
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
    this.undoStack.push(this.save());

    this.currentLine.to = this.currentLine.to.clamp(this.renderer.size);

    const newLine = new CompletedLine(this.currentLine);
    this.lines.push(newLine);
    this.currentLine = undefined;
  }

  addDropper(pos: Vec) {
    this.undoStack.push(this.save());
    this.droppers.push({ pos, timeout: 0 });
  }

  save(): SerialisedState {
    return {
      settings: { ...this.sim },
      sampler: {
        instrument: this.sampler.instrument,
        root: this.sampler.getRootNote(),
        scaleType: this.sampler.getScaleType(),
      },
      size: this.renderer.size.serialise(),
      droppers: this.droppers.map((d) => ({ pos: d.pos, timeout: d.timeout })),
      lines: structuredClone(this.lines),
    };
  }

  load(from: SerialisedState) {
    this.lines = from.lines.map((l) => CompletedLine.deserialise(l));
    this.droppers = from.droppers.map((d) => ({
      pos: Vec.deserialise(d.pos),
      timeout: d.timeout,
    }));
    this.sim = { ...from.settings };
    this.sampler.setRootNote(from.sampler.root);
    this.sampler.setScaleType(from.sampler.scaleType);
    this.sampler.instrument = from.sampler.instrument;
  }

  /**
   * Queues an undo for the end of the frame.
   */
  undo() {
    this.shouldUndo = true;
  }

  /**
   * Saves the current state to the URL for sharing.
   */
  saveToLocal() {
    const serialised = this.save();
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
      const xOffset = (this.renderer.size.x - parsed.size.x) / 2;
      for (const d of parsed.droppers) {
        d.pos.x += xOffset;
      }
      for (const l of parsed.lines) {
        l.from.x += xOffset;
        l.to.x += xOffset;
      }

      this.load(parsed);
    } catch {
      // This could easily happen and we don't especially care - no handling.
      return;
    }
  }
}

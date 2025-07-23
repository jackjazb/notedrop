import { CompletedLine, type Line } from "./line";
import { type Ball, type Dropper, type SerialisedState, type SimulationParams, type Tool } from "./model";
import { Renderer } from "./renderer";
import { NoteSampler } from "./sampler";
import { Vec, vec } from "./vec";

const DefaultSimulationSettings: SimulationParams = {
  gravity: 1,
  bounce: 0.9,
  dropperTimeout: 800
};

export class State {
  renderer: Renderer;
  sampler: NoteSampler;

  /**
   * Settings for gravity etc.
   */
  sim: SimulationParams = DefaultSimulationSettings;

  // Interaction.
  currentLine?: Line;
  tool: Tool = 'line';

  // Core simulation state.
  lines: CompletedLine[] = [];
  droppers: Dropper[] = [];
  balls: Ball[] = [];

  undoStack: SerialisedState[] = [];
  shouldUndo = false;

  constructor() {
    this.renderer = new Renderer();
    this.sampler = new NoteSampler();

    this.droppers.push({
      pos: this.renderer.size.divide(2).minus(vec(0, this.renderer.size.y / 4)),
      timeout: 0
    });
  };

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

      // Check each line for a bounce.
      for (const l of this.lines) {
        let bounced = false;
        // Handle vertical lines.
        if (!isFinite(l.m)) {
          const willCrossX = Math.sign(b.pos.x - l.from.x) !== Math.sign(nextPos.x - l.from.x);
          const alignsY = b.pos.y > l.from.y && b.pos.y < l.to.y;
          if (willCrossX && alignsY) {
            b.vel = l.bounce(b.vel);
            bounced = true;
            nextPos = b.pos;
          }
        }
        // Check the ball is in the rect formed by the lines x coordinates.
        else if (b.pos.isOutside(vec(l.from.x, -Infinity), vec(l.to.x, Infinity))) {
          continue;
        }

        // If the ball is going to cross the line next frame, we need to bounce.
        else if (b.pos.isAbove(l) !== nextPos.isAbove(l)) {
          b.vel = l.bounce(b.vel);
          bounced = true;
          nextPos = b.pos;
        }
        if (bounced) {
          this.sampler.play(b.vel.mag());
          break;
        }
      }

      // Remove anything outside the canvas post bouncing.
      if (nextPos.isOutside(vec(0, 0), this.renderer.size)) {
        this.balls.splice(i, 1);
        continue;
      }
      b.pos = nextPos;
    }
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
        stroke: true
      });
    }

    for (const b of this.balls) {
      this.renderer.drawCircle({
        centre: b.pos,
        radius: 4,
      });
    }
  }

  addCurrentLine() {
    if (!this.currentLine) {
      return;
    }
    this.undoStack.push(this.save());

    this.currentLine.to = this.currentLine.to.clamp(this.renderer.size);

    let newLine = new CompletedLine(this.currentLine);
    this.lines.push(newLine);
    this.currentLine = undefined;
  }

  addDropper(pos: Vec) {
    this.undoStack.push(this.save());
    this.droppers.push({ pos, timeout: 0 });
  }

  save(): SerialisedState {
    return {
      droppers: this.droppers.map(d => ({ pos: d.pos, timeout: d.timeout })),
      lines: structuredClone(this.lines)
    };
  }

  load(from: SerialisedState) {
    this.lines = from.lines.map(l => CompletedLine.load(l));
    this.droppers = from.droppers.map(d => ({ pos: Vec.load(d.pos), timeout: d.timeout }));
  }

  undo() {
    this.shouldUndo = true;
  }

  saveToLocal() {
    const serialised = this.save();
    window.localStorage.setItem("notedrop", JSON.stringify(serialised));
  }

  loadFromLocal() {
    const serialised = window.localStorage.getItem("notedrop");
    if (!serialised) {
      return;
    }
    this.load(JSON.parse(serialised));
  }
}

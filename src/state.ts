import { CompletedLine, type Line } from "./line";
import { type Ball, type Dropper, type FrameTime, type SerialisedState, type SimulationParams, type Tool } from "./model";
import { Renderer } from "./renderer";
import { NoteSampler } from "./sampler";
import { jsonTable } from "./utils";
import { Vec, vec } from "./vec";

const DefaultSimulationSettings: SimulationParams = {
  ballTerminal: 500,
  gravity: 500,
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

  /**
   * Frame time info.
   */
  frame: FrameTime = {
    lastTime: 0,
    delta: 0
  };

  // Debug printing util
  debug: {
    el: HTMLPreElement;
    enabled: boolean;
    content: Record<string, number>;
  };

  undoStack: SerialisedState[] = [];
  shouldUndo = false;

  constructor() {
    this.renderer = new Renderer();
    this.sampler = new NoteSampler();

    const dbg = document.createElement('pre');
    document.body.appendChild(dbg);

    this.debug = {
      el: dbg,
      enabled: false,
      content: {
        frames: 0
      }
    };

    this.droppers.push({
      pos: this.renderer.size.divide(2).minus(vec(0, this.renderer.size.y / 4)),
      timeout: 0
    });
  };

  update() {
    const now = performance.now();
    this.frame.delta = now - this.frame.lastTime;
    this.frame.lastTime = now;

    this.debug.content.runtime = now / 1000;
    this.debug.content.frames++;
    if (this.debug.content.frames % 20 === 0) {
      this.debug.content.fps = (1000 / this.frame.delta);
    }
    // Add balls to timed out droppers
    for (const d of this.droppers) {
      d.timeout -= this.frame.delta;
      if (d.timeout > 0) {
        continue;
      }
      d.timeout = this.sim.dropperTimeout;
      this.balls.push({
        pos: d.pos.clone(),
        vel: vec(0, 0),
        acc: vec(0, 0),
      });

      // TEMP
      if (this.balls.length >= 2) {
        d.timeout = Infinity;
      }
    }

    const deltaSecs = this.frame.delta / 1000;
    for (const [i, b] of this.balls.entries()) {
      // Acceleration = gravity.
      // For air resistance, do acc.minus(vec(0, b.vel.y / this.sim.ballTerminal).times(this.sim.gravity))  
      // Effectively gravity + drag as a fraction of gravity.
      // However, this does make the balls less bouncy...

      b.acc = vec(0, this.sim.gravity);

      // Add acceleration normalised for frame time to current velocity.
      b.vel = b.vel.add(b.acc.times(deltaSecs));

      // Calculate the position next frame by adding frame normalised velocity to position.
      let nextPos = b.pos.add(b.vel.times(deltaSecs));

      // Remove anything outside the canvas.
      if (nextPos.isOutside(vec(0, 0), this.renderer.size)) {
        this.balls.splice(i, 1);
        continue;
      }

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
          this.sampler.play(b.vel.mag(), this.sim.gravity);
          break;
        }
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

  updateDebugDisplay() {
    this.debug.el.textContent = this.debug.enabled ? jsonTable(this.debug.content) : '';
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

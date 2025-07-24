import type { Serialisable, SerialisedLine } from "./model";
import { Vec, vec } from "./vec";

export type Line = {
  from: Vec;
  to: Vec;
};

export function line(from: Vec, to: Vec) {
  return { from, to };
}

/**
 * A line of the form y = mx + c
 */
export class CompletedLine implements Serialisable {
  from: Vec;
  to: Vec;
  m: number;
  c: number;

  constructor({ from, to }: Line) {
    this.from = from;
    this.to = to;
    // Note these will be infinite for vertical lines.
    const vector = this.to.minus(this.from);
    this.m = vector.y / vector.x;
    // Rearranged, y - mx = c
    this.c = this.from.y - this.m * this.from.x;
  }

  /**
   * Returns the normal vector.
   * See https://stackoverflow.com/questions/7469959/given-2-points-how-do-i-draw-a-line-at-a-right-angle-to-the-line-formed-by-the-t/7470098#7470098
   */
  get normal(): Vec {
    const dir = this.to.minus(this.from);
    return vec(-dir.y, dir.x).normalised();
  }

  /**
   * See https://stackoverflow.com/questions/573084/how-to-calculate-bounce-angle
   * We're basically reversing the component of velocity perpendicular to the wall.
   */
  bounce(vel: Vec): Vec {
    const u = this.normal.times(vel.dot(this.normal));
    const w = vel.minus(u);
    return w.minus(u);
  }

  save(): SerialisedLine {
    return {
      from: this.from.save(),
      to: this.to.save(),
    };
  }

  static load(line: SerialisedLine) {
    return new CompletedLine({
      from: Vec.load(line.from),
      to: Vec.load(line.to),
    });
  }
}

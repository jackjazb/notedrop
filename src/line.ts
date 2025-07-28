import type { Line } from "./renderer";
import { Vec, vec, type SerialisedVector } from "./vec";

export type SerialisedLine = {
  from: SerialisedVector;
  to: SerialisedVector;
};

export function line(from: Vec, to: Vec) {
  return { from, to };
}

/**
 * A line with a from and to vector.
 * Has its formula (y = mx + c) calculated and set on construction.
 */
export class StaticLine {
  from: Vec;
  to: Vec;
  m: number;
  c: number;

  constructor({ from, to }: Line) {
    this.from = from;
    this.to = to;
    if (from.x === to.x) {
      this.m = Infinity;
      this.c = Infinity;
      return;
    }
    // Note these will be infinite for vertical lines.
    const vector = this.to.minus(this.from);
    this.m = vector.y / vector.x;

    // Rearranged: y - mx = c
    this.c = this.from.y - this.m * this.from.x;
  }

  /**
   * Returns the normal vector of the line.
   * See https://stackoverflow.com/questions/7469959/given-2-points-how-do-i-draw-a-line-at-a-right-angle-to-the-line-formed-by-the-t/7470098#7470098
   */
  normal(): Vec {
    const dir = this.to.minus(this.from);
    return vec(-dir.y, dir.x).normalised();
  }

  /**
   * See https://stackoverflow.com/questions/573084/how-to-calculate-bounce-angle
   * We're basically reversing the component of velocity perpendicular to the wall.
   */
  bounce(vel: Vec): Vec {
    const u = this.normal().times(vel.dot(this.normal()));
    const w = vel.minus(u);
    return w.minus(u);
  }

  /**
   * Serialises all relevant properties of the line.
   */
  serialise(): SerialisedLine {
    return {
      from: this.from.serialise(),
      to: this.to.serialise(),
    };
  }

  /**
   * Create a new line from a statically store done.
   */
  static deserialise(line: SerialisedLine) {
    return new StaticLine({
      from: Vec.deserialise(line.from),
      to: Vec.deserialise(line.to),
    });
  }

  toString() {
    return `${this.from} -> ${this.to}`;
  }
}

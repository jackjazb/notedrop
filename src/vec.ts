import type { CompletedLine } from "./line";
import type { Serialisable, SerialisedVector } from "./model";

export function vec(x: number, y: number): Vec {
  return new Vec(x, y);
}

export class Vec implements Serialisable {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Returns the magnitude of the vec.
   */
  mag(): number {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  /**
   * Get the distance to another vec.
   */
  dist(b: Vec): number {
    const vecTo = vec(b.x - this.x, b.y - this.y);
    return vecTo.mag();
  }

  isOutside(lbound: Vec, ubound: Vec) {
    const xOut = this.x < lbound.x || this.x > ubound.x;
    const yOut = this.y < lbound.y || this.y > ubound.y;
    return xOut || yOut;
  }

  clamp(max: Vec) {
    const x = Math.max(0, Math.min(this.x, max.x));
    const y = Math.max(0, Math.min(this.y, max.y));
    return new Vec(x, y);
  };

  clone() {
    return new Vec(this.x, this.y);
  }

  add(vec: Vec) {
    return new Vec(this.x + vec.x, this.y + vec.y);
  }

  minus(vec: Vec) {
    return new Vec(this.x - vec.x, this.y - vec.y);
  }

  times(num: number) {
    return new Vec(this.x * num, this.y * num);
  }

  divide(num: number) {
    return new Vec(this.x / num, this.y / num);
  }

  normalised(): Vec {
    const mag = this.mag();
    return new Vec(this.x / mag, this.y / mag);
  }

  isAbove(line: CompletedLine): boolean {
    const y = line.m * this.x + line.c;
    return this.y > y;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  dot(v: Vec) {
    return this.x * v.x + this.y * v.y;
  }

  save(): SerialisedVector {
    return {
      x: this.x,
      y: this.y
    };
  }

  static load(from: SerialisedVector) {
    return new Vec(from.x, from.y);
  }
}

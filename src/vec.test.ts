import { describe, expect, test } from "vitest";
import { Vec, vec } from "./vec";

describe("Vec", () => {
  describe("mag", () => {
    test.for<[Vec, number]>([
      [vec(3, 4), 5],
      [vec(0, 1), 1],
      [vec(-3, -4), 5],
      [vec(0, 0), 0],
      [vec(Infinity, 0), Infinity],
    ])("should calculate the magnitude of %s as %s", ([vec, expected]) => {
      const res = vec.mag();
      expect(res).toBeCloseTo(expected, 3);
    });
  });

  describe("dist", () => {
    test.for<[Vec, Vec, number]>([
      [vec(2, 4), vec(3, 5), 1.414],
      [vec(0, 0), vec(-1, 0), 1],
      [vec(0.0001, 0), vec(-0.0001, 0), 0.0002],
      [vec(1000, 10), vec(-0.0001, 0.0002), 1000.05],
    ])(
      "should calculate the distance from %s to %s as %s",
      ([from, to, expected]) => {
        const res = from.dist(to);
        expect(res).toBeCloseTo(expected, 3);
      }
    );
  });

  describe("isOutside", () => {
    test.for<[Vec, [Vec, Vec], boolean]>([
      [vec(10, 10), [vec(20, 20), vec(30, 30)], true],
      [vec(10, 10), [vec(0, 0), vec(30, 30)], false],
      [vec(0, 0), [vec(0, 0), vec(0, 0)], false],
      [vec(-15, -15), [vec(-10, -10), vec(-20, -20)], true],
    ])("should check if %s is within %s ", ([vec, bounds, outside]) => {
      expect(vec.isOutside(bounds[0], bounds[1])).toBe(outside);
    });
  });

  describe("clamp", () => {
    test.for<[Vec, Vec, Vec]>([
      [vec(10, 10), vec(5, 5), vec(5, 5)],
      [vec(-10, -10), vec(5, 5), vec(0, 0)],
      [vec(10, -10), vec(5, 5), vec(5, 0)],
      [vec(-10, 10), vec(5, 5), vec(0, 5)],
      [vec(0, 0), vec(0, 0), vec(0, 0)],
    ])("should limit %s to %s for the bounds %s", ([vec, bounds, expected]) => {
      expect(vec.clamp(bounds)).toStrictEqual(expected);
    });
  });

  describe("add", () => {
    test.for<[Vec, Vec, Vec]>([
      [vec(2, 4), vec(3, 5), vec(5, 9)],
      [vec(0, 0), vec(-1, 0), vec(-1, 0)],
      [vec(0.0001, 0), vec(-0.0001, 0), vec(0, 0)],
      [vec(1000, -5), vec(-10, 5), vec(990, 0)],
    ])("should return %s + %s = %s", ([a, b, expected]) => {
      expect(a.add(b)).toStrictEqual(expected);
    });
  });

  describe("minus", () => {
    test.for<[Vec, Vec, Vec]>([
      [vec(2, 4), vec(3, 5), vec(-1, -1)],
      [vec(0, 0), vec(-1, 0), vec(1, 0)],
      [vec(0.0001, 0), vec(-0.0001, 0), vec(0.0002, 0)],
      [vec(1000, -5), vec(-10, 5), vec(1010, -10)],
    ])("should return %s - %s = %s", ([a, b, expected]) => {
      expect(a.minus(b)).toStrictEqual(expected);
    });
  });

  describe("normalised", () => {
    test.for<[Vec, Vec]>([
      [vec(2, 4), vec(0.447, 0.894)],
      [vec(3, 4), vec(0.6, 0.8)],
      [vec(0.5, 0), vec(1, 0)],
      [vec(0, 0), vec(0, 0)],
    ])("should return %s as the normalised version of %s", ([a, expected]) => {
      const { x, y } = a.normalised();
      expect(x).toBeCloseTo(expected.x, 3);
      expect(y).toBeCloseTo(expected.y, 3);
    });
  });

  describe("dot", () => {
    test.for<[Vec, Vec, number]>([
      [vec(2, 4), vec(3, 5), 26],
      [vec(-10, 0), vec(3, 10), -30],
      [vec(0, 0), vec(0, 0), 0],
    ])("should return %s dot %s as %s", ([a, b, expected]) => {
      expect(a.dot(b)).toStrictEqual(expected);
    });
  });

  describe("clone", () => {
    test("should return a new vector with the same values as the source", () => {
      const original = vec(10, 20);
      const clone = original.clone();
      original.x = 0;
      expect(clone.x).toBe(10);
    });
  });

  describe("serialise", () => {
    test("should correctly serialise the vector", () => {
      const res = vec(10, 10).serialise();
      expect(res).toStrictEqual({ x: 10, y: 10 });
    });
  });

  describe("deserialise", () => {
    test("should correctly deserialise a vector", () => {
      const res = Vec.deserialise(vec(10, 10).serialise());
      expect(res).toStrictEqual(vec(10, 10));
    });
  });
});

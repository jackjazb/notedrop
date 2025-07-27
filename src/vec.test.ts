import { describe, expect, test } from "vitest";
import { vec } from "./vec";

describe("Vec", () => {
  describe("mag", () => {
    test.for([
      { vec: vec(3, 4), expected: 5 },
      { vec: vec(0, 1), expected: 1 },
      { vec: vec(-3, -4), expected: 5 },
      { vec: vec(0, 0), expected: 0 },
      { vec: vec(Infinity, 0), expected: Infinity },
    ])(
      "should calculate the magnitude of [$vec.x, $vec.y] as $expected",
      ({ vec, expected }) => {
        const res = vec.mag();
        expect(res).toBeCloseTo(expected, 3);
      }
    );
  });

  describe("dist", () => {
    test.for([
      { from: vec(2, 4), to: vec(3, 5), expected: 1.414 },
      { from: vec(0, 0), to: vec(-1, 0), expected: 1 },
      { from: vec(0.0001, 0), to: vec(-0.0001, 0), expected: 0.0002 },
      { from: vec(1000, 10), to: vec(-0.0001, 0.0002), expected: 1000.05 },
    ])(
      "should calculate the distance to [$to.x, $to.y] from [$from.x, $from.y] as $expected",
      ({ from, to, expected }) => {
        const res = from.dist(to);
        expect(res).toBeCloseTo(expected, 3);
      }
    );
  });

  describe("isOutside", () => {
    test.for([
      { vec: vec(10, 10), bounds: [vec(20, 20), vec(30, 30)], outside: true },
      { vec: vec(10, 10), bounds: [vec(0, 0), vec(30, 30)], outside: false },
      { vec: vec(0, 0), bounds: [vec(0, 0), vec(0, 0)], outside: false },
      {
        vec: vec(-15, -15),
        bounds: [vec(-10, -10), vec(-20, -20)],
        outside: true,
      },
    ])(
      "should check if [$vec.x, $vec.y] is within [$bounds.0.x, $bounds.0.y] and [$bounds.1.x, $bounds.1.y]",
      ({ vec, bounds, outside }) => {
        expect(vec.isOutside(bounds[0], bounds[1])).toBe(outside);
      }
    );
  });

  describe("clamp", () => {
    test.for([
      { vec: vec(10, 10), bounds: vec(5, 5), expected: vec(5, 5) },
      { vec: vec(-10, -10), bounds: vec(5, 5), expected: vec(0, 0) },
      { vec: vec(10, -10), bounds: vec(5, 5), expected: vec(5, 0) },
      { vec: vec(-10, 10), bounds: vec(5, 5), expected: vec(0, 5) },
      { vec: vec(0, 0), bounds: vec(0, 0), expected: vec(0, 0) },
    ])(
      "should limit [$vec.x, $vec.y] to [$expected.x, $expected.y] for the bounds [$bounds.x, $bounds.y]",
      ({ vec, bounds, expected }) => {
        expect(vec.clamp(bounds)).toStrictEqual(expected);
      }
    );
  });

  describe("add", () => {
    test.for([
      { a: vec(2, 4), b: vec(3, 5), expected: vec(5, 9) },
      { a: vec(0, 0), b: vec(-1, 0), expected: vec(-1, 0) },
      { a: vec(0.0001, 0), b: vec(-0.0001, 0), expected: vec(0, 0) },
      { a: vec(1000, -5), b: vec(-10, 5), expected: vec(990, 0) },
    ])(
      "should return [$a.x, $a.y] + [$b.x, $b.y] = [$expected.x, $expected.y]",
      ({ a, b, expected }) => {
        expect(a.add(b)).toStrictEqual(expected);
      }
    );
  });

  describe("minus", () => {
    test.for([
      { a: vec(2, 4), b: vec(3, 5), expected: vec(-1, -1) },
      { a: vec(0, 0), b: vec(-1, 0), expected: vec(1, 0) },
      { a: vec(0.0001, 0), b: vec(-0.0001, 0), expected: vec(0.0002, 0) },
      { a: vec(1000, -5), b: vec(-10, 5), expected: vec(1010, -10) },
    ])(
      "should return [$a.x, $a.y] 0 [$b.x, $b.y] = [$expected.x, $expected.y]",
      ({ a, b, expected }) => {
        expect(a.minus(b)).toStrictEqual(expected);
      }
    );
  });

  describe("normalised", () => {
    test.for([
      { a: vec(2, 4), expected: vec(0.447, 0.894) },
      { a: vec(3, 4), expected: vec(0.6, 0.8) },
      { a: vec(0.5, 0), expected: vec(1, 0) },
      { a: vec(0, 0), expected: vec(0, 0) },
    ])(
      "should return [$expected.x, $expected.y] as the normalised version of [$a.x, $a.y]",
      ({ a, expected }) => {
        const { x, y } = a.normalised();
        expect(x).toBeCloseTo(expected.x, 3);
        expect(y).toBeCloseTo(expected.y, 3);
      }
    );
  });

  describe("dot", () => {
    test.for([
      { a: vec(2, 4), b: vec(3, 5), expected: 26 },
      { a: vec(-10, 0), b: vec(3, 10), expected: -30 },
      { a: vec(0, 0), b: vec(0, 0), expected: 0 },
    ])(
      "should return $expected as the dot product of [$a.x, $a.y] and [$b.x, $b.y]",
      ({ a, b, expected }) => {
        expect(a.dot(b)).toStrictEqual(expected);
      }
    );
  });

  describe("clone", () => {
    test("should return a new vector with the same values as the source", () => {
      const original = vec(10, 20);
      const clone = original.clone();
      original.x = 0;
      expect(clone.x).toBe(10);
    });
  });
});

import { describe, expect, it } from "vitest";
import { CompletedLine, line, type Line } from "./line";
import { Vec, vec } from "./vec";

describe("Vec", () => {
  describe("mag", () => {
    it("should return the magnitude of a vector", () => {
      const res = vec(3, 4).mag();
      expect(res).toEqual(5);
    });
  });

  describe("dist", () => {
    it("should return the distance between two vectors", () => {
      const res = vec(0, 0).dist(vec(3, 4));
      expect(res).toEqual(5);
    });
  });

  describe("isOutside", () => {
    it("should return true if the vector is outside the passed bounds", () => {
      expect(vec(10, 10).isOutside(vec(20, 20), vec(30, 30))).toBe(true);
    });
    it("should return false if the vector is within the passed bounds", () => {
      expect(vec(10, 10).isOutside(vec(0, 0), vec(30, 30))).toBe(false);
    });
  });

  describe("isAbove", () => {
    type Case = {
      point: Vec;
      line: Line;
      expected: boolean;
    };
    it.each<Case>([
      {
        point: vec(10, 10),
        line: line(vec(5, 0), vec(10, 0)),
        expected: true,
      },
      {
        point: vec(10, -10),
        line: line(vec(5, 0), vec(10, 0)),
        expected: false,
      },
      {
        point: vec(10, -10),
        line: line(vec(10, 0), vec(5, 0)), // Double checking out of order points.
        expected: false,
      },
    ])(
      "should return true if $point is above the line formed by $line",
      ({ point, line, expected }) => {
        expect(point.isAbove(new CompletedLine(line))).toEqual(expected);
      }
    );
  });
});

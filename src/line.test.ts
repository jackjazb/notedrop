import { describe, expect, test } from "vitest";
import { StaticLine, line } from "./line";
import { Vec, vec } from "./vec";

describe("Line", () => {
  describe("constructor", () => {
    test("should calculate m and c for the line's points", () => {
      const l = new StaticLine(line(vec(0, 5), vec(10, 10)));
      expect(l.c).toEqual(5);
      expect(l.m).toEqual(0.5);
    });
    test("should handle vertical lines", () => {
      const l = new StaticLine(line(vec(0, 5), vec(0, 10)));
      expect(l.m).toEqual(Infinity);
      expect(l.c).toEqual(Infinity);
    });
  });

  describe("normal", () => {
    test.for<[StaticLine, Vec]>([
      [new StaticLine(line(vec(0, 0), vec(10, 0))), vec(-0, 1)],
      [new StaticLine(line(vec(0, 0), vec(0, 10))), vec(-1, 0)],
      [new StaticLine(line(vec(0, 0), vec(3, 4))), vec(-0.8, 0.6)],
    ])("should return the normal vector of %s as %s", ([line, expected]) => {
      const normal = line.normal();
      expect(normal).toStrictEqual(expected);
    });
  });

  describe("bounce", () => {
    test.for<[Vec, StaticLine, Vec]>([
      [vec(1, 1), new StaticLine(line(vec(0, 0), vec(10, 0))), vec(1, -1)],
      [vec(1, 1), new StaticLine(line(vec(0, 0), vec(0, 10))), vec(-1, 1)],
      [vec(0, 1), new StaticLine(line(vec(0, 0), vec(0, 10))), vec(0, 1)],
      [vec(1, -1), new StaticLine(line(vec(0, 0), vec(0, 10))), vec(-1, -1)],
    ])(
      "should return the bounce of %s off %s as %s ",
      ([vel, line, expected]) => {
        const bounce = line.bounce(vel);
        expect(bounce).toStrictEqual(expected);
      }
    );
  });

  describe("serialise", () => {
    test("should correctly serialise the line", () => {
      const res = new StaticLine(line(vec(-10, -10), vec(10, 10))).serialise();
      expect(res).toStrictEqual({
        from: { x: -10, y: -10 },
        to: { x: 10, y: 10 },
      });
    });
  });
  describe("deserialise", () => {
    test("should correctly deserialise the line", () => {
      const res = StaticLine.deserialise(
        new StaticLine(line(vec(-10, -10), vec(10, 10))).serialise()
      );
      expect(res).toStrictEqual(
        new StaticLine(line(vec(-10, -10), vec(10, 10)))
      );
    });
  });
});

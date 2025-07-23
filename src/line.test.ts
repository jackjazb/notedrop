import { describe, expect, it } from "vitest";
import { CompletedLine, line } from "./line";
import { vec } from "./vec";

describe('Line', () => {
  it("should sort the line's points in ascending order along the x axis", () => {
    expect(new CompletedLine(line(vec(10, 0), vec(5, 0))).from.x).toBe(5);
  });
  it("should calculate m and c for the line's points", () => {
    const l = new CompletedLine(line(vec(0, 5), vec(10, 10)));
    expect(l.c).toEqual(5);
    expect(l.m).toEqual(0.5);
  });
});
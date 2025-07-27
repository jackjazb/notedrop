import { describe, expect, test } from "vitest";
import { CompletedLine, line } from "./line";
import { vec } from "./vec";

describe("Line", () => {
  test("should calculate m and c for the line's points", () => {
    const l = new CompletedLine(line(vec(0, 5), vec(10, 10)));
    expect(l.c).toEqual(5);
    expect(l.m).toEqual(0.5);
  });
});

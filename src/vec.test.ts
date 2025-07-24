import { describe, expect, it } from "vitest";
import { vec } from "./vec";

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
});

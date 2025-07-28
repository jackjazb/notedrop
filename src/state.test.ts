import { beforeEach, describe, expect, test, vi, type Mock } from "vitest";
import { line, StaticLine } from "./line";
import { Renderer } from "./renderer";
import { State, type SerialisedState } from "./state";
import { Vec, vec } from "./vec";

const TestDimensions = vec(400, 700);

vi.mock(import("./renderer"));
vi.mock(import("./sampler"));

vi.stubGlobal("window", {
  location: {
    href: "http://localhost:5173",
  },
  history: {
    pushState: vi.fn(),
  },
});

describe("State", () => {
  /**
   * Simple helper for advancing state manually.
   */
  function step(state: State, times: number, step = 1) {
    for (const _ of Array(times)) {
      state.update(step);
    }
  }

  /**
   * Helper for adding balls.
   */
  function addBall(state: State, pos: Vec) {
    state.balls.push({
      acc: vec(0, 0),
      pos,
      vel: vec(0, 0),
    });
  }

  let state: State;
  const gravity = 1;

  beforeEach(() => {
    vi.spyOn(Renderer.prototype, "size").mockReturnValue(TestDimensions);

    state = new State();
    state.state.gravity = gravity;
    state.state.droppers = [];

    (state.renderer.size as Mock).mockReturnValue(TestDimensions);
  });

  describe("constructor", () => {
    test("should create an initial dropper", () => {
      state = new State();
      expect(state.state.droppers[0].pos).toStrictEqual(
        vec(TestDimensions.x / 2, TestDimensions.y / 4)
      );
    });

    test("should set up default settings", () => {
      state = new State();
      expect(state.state).toStrictEqual(
        expect.objectContaining({
          gravity: 1.5,
          dropperTimeout: 800,
          instrument: "marimba",
          root: "C",
          scaleType: "major",
        })
      );
    });
  });

  describe("update", () => {
    test("should create a ball each time a dropper times out", () => {
      state.addDropper(vec(0, 0));
      state.state.dropperTimeout = 1;

      expect(state.balls.length).toBe(0);
      state.update(0);
      expect(state.balls.length).toBe(1);
      state.update(1);
      expect(state.balls.length).toBe(2);
    });

    test("should set the acceleration of each ball", () => {
      addBall(state, vec(0, 0));

      state.update(0);
      expect(state.balls[0].acc.y).toBeCloseTo(gravity / 1000);

      state.update(1);
      expect(state.balls[0].acc.y).toBeCloseTo(gravity / 1000);
    });

    test("should increase the velocity by acceleration * time step", () => {
      addBall(state, vec(0, 0));

      state.update(0);
      expect(state.balls[0].vel.y).toBeCloseTo(0);

      step(state, 10);
      expect(state.balls[0].vel.y).toBeCloseTo(0.01); // (gravity / 1000) * 10)

      step(state, 10);
      expect(state.balls[0].vel.y).toBeCloseTo(0.02);
    });

    test("should remove balls which are out of bounds", () => {
      addBall(state, vec(0, TestDimensions.y + 1));

      state.update(1);
      expect(state.balls.length).toBe(0);
    });

    test("should bounce balls if they will cross a line next frame", () => {
      addBall(state, vec(20, 0));

      state.state.lines.push(new StaticLine(line(vec(0, 10), vec(30, 10))));
      const ball = state.balls[0];

      step(state, 140);
      // Directly above the line.
      expect(ball.pos.y).toBeCloseTo(9.87);

      step(state, 1);
      // Bounce has occurred.
      expect(ball.pos.y).toBeCloseTo(9.729);
      expect(ball.vel.y).toBeCloseTo(-0.141);

      step(state, 140);
      // Back at the apex.
      expect(ball.pos.y).toBeCloseTo(0.012);
    });

    test("should bounce off lines with very large gradients", () => {
      addBall(state, vec(20, 50));
      const ball = state.balls[0];
      ball.vel.x = 1;
      state.state.lines.push(new StaticLine(line(vec(50, 100), vec(51, 10))));

      step(state, 30);
      // Directly to left of line.
      expect(ball.pos.x).toBeCloseTo(50);

      step(state, 1);
      // Bounce has occured
      expect(ball.pos.x).toBeCloseTo(49);
      expect(ball.vel.x).toBeCloseTo(-1);

      step(state, 55);
      // Off screen
      expect(state.balls.length).toBe(0);
    });

    test("should trigger a sound on bounce", () => {
      addBall(state, vec(20, 0));

      state.state.instrument = "guitar";
      state.state.scaleType = "pentatonic_major";
      state.state.root = "B";
      state.state.lines.push(new StaticLine(line(vec(0, 10), vec(30, 10))));

      state.update(0);
      expect(state.balls.length).toBe(1);

      step(state, 280);
      expect(state.sampler.play).toHaveBeenCalledWith(
        expect.closeTo(0.141),
        "guitar",
        "B",
        "pentatonic_major"
      );
    });
  });

  describe("clearBoard", () => {
    test("should erase balls, lines and droppers", () => {
      const state = new State();
      state.update(0);
    });
  });

  describe("render", () => {
    test("should draw the current line", () => {
      state.currentLine = line(vec(10, 10), vec(20, 20));
      state.render();
      expect(state.renderer.drawLine).toHaveBeenCalledWith(state.currentLine);
    });

    test("should draw existing lines", () => {
      state.state.lines.push(new StaticLine(line(vec(10, 10), vec(20, 20))));
      state.render();
      expect(state.renderer.drawLine).toHaveBeenCalledWith(
        state.state.lines[0]
      );
    });

    test("should draw droppers ", () => {
      state.state.droppers.push({
        pos: vec(10, 10),
        timeout: 0,
      });
      state.render();
      expect(state.renderer.drawCircle).toHaveBeenCalledWith({
        centre: vec(10, 10),
        radius: 4,
        stroke: true,
      });
    });

    test("should draw balls ", () => {
      addBall(state, vec(10, 0));
      state.render();
      expect(state.renderer.drawCircle).toHaveBeenCalledWith({
        centre: vec(10, 0),
        radius: 4,
      });
    });
  });

  describe("addCurrentLine", () => {
    test("should push the current line to the lines array", () => {
      state.currentLine = line(vec(10, 10), vec(20, 20));
      state.addCurrentLine();
      expect(state.state.lines[0]).toStrictEqual(
        new StaticLine(line(vec(10, 10), vec(20, 20)))
      );
    });
  });

  describe("serialise", () => {
    test("should correctly serialise the current state", () => {
      state.state.lines.push(new StaticLine(line(vec(0, 10), vec(30, 10))));
      state.addDropper(vec(10, 10));
      const result = state.serialise();
      expect(result).toStrictEqual({
        dropperTimeout: 800,
        droppers: [
          {
            pos: {
              x: 10,
              y: 10,
            },
            timeout: 0,
          },
        ],
        gravity: 1,
        instrument: "marimba",
        lines: [
          {
            from: {
              x: 0,
              y: 10,
            },
            to: {
              x: 30,
              y: 10,
            },
          },
        ],
        root: "C",
        scaleType: "major",
        size: {
          x: 400,
          y: 700,
        },
      });
    });
  });

  describe("deserialise", () => {
    test("should correctly deserialise a state from JSON", () => {
      const serialised: SerialisedState = {
        dropperTimeout: 500,
        droppers: [
          {
            pos: {
              x: 10,
              y: 10,
            },
            timeout: 0,
          },
        ],
        gravity: 1.2,
        instrument: "guitar",
        lines: [
          {
            from: {
              x: 0,
              y: 10,
            },
            to: {
              x: 30,
              y: 10,
            },
          },
        ],
        root: "C",
        scaleType: "major",
        size: {
          x: 400,
          y: 700,
        },
      };
      state.deserialise(serialised);
      expect(state.state).toStrictEqual({
        dropperTimeout: 500,
        gravity: 1.2,
        root: "C",
        scaleType: "major",
        instrument: "guitar",
        droppers: [
          {
            pos: vec(10, 10),
            timeout: 0,
          },
        ],
        lines: [new StaticLine(line(vec(0, 10), vec(30, 10)))],
      });
    });
  });

  describe("saveToUrl", () => {
    test("should save the current state to the window history as a base64 encoded string", () => {
      state.addDropper(vec(10, 10));
      state.saveToUrl();
      expect(window.history.pushState).toHaveBeenCalledWith(
        null,
        "",
        expect.stringMatching(/http:\/\/localhost:5173\/\?state=[A-Za-z\d%]+/)
      );
    });
  });

  describe("loadFromUrl", () => {
    test("should load a state from the window URL", async () => {
      const serialised: SerialisedState = {
        dropperTimeout: 500,
        droppers: [],
        gravity: 1.2,
        instrument: "guitar",
        lines: [],
        root: "G",
        scaleType: "major",
        size: {
          x: 400,
          y: 700,
        },
      };
      const json = JSON.stringify(serialised);
      const encoded = btoa(json);
      window.location.href = `http://locahost/?state=${encoded}`;
      await state.loadFromUrl();
      expect(state.state.root).toBe("G");
      expect(state.state.instrument).toBe("guitar");
      expect(state.state.gravity).toBe(1.2);
    });
  });
});

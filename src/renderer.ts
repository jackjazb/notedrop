import { vec, type Vec } from "./vec";

export const BG = "black";
export const FG = "white";

export type Circle = {
  centre: Vec;
  radius: number;
  stroke?: boolean;
};

export type Line = {
  from: Vec;
  to: Vec;
};

/**
 * Provides necessary canvas rendering primitives.
 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  public canvas: HTMLCanvasElement;

  constructor() {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    this.canvas = canvas;
    this.canvas.focus();

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("ctx is undefined");
    }
    this.ctx = ctx;
    this.canvas.style.backgroundColor = BG;
    this.resize(window.innerWidth, window.innerHeight);
  }

  size(): Vec {
    return vec(this.canvas.width, this.canvas.height);
  }

  resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.strokeStyle = FG;
    this.ctx.fillStyle = FG;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawCircle(circle: Circle) {
    this.ctx.beginPath();

    this.ctx.arc(
      circle.centre.x,
      circle.centre.y,
      circle.radius,
      0,
      Math.PI * 2,
      false
    );
    if (circle.stroke) {
      this.ctx.stroke();
    } else {
      this.ctx.fill();
    }
    this.ctx.closePath();
  }

  drawLine(line: Line) {
    const { from, to } = line;
    const r = 2;

    this.drawCircle({ centre: from, radius: r });
    this.drawCircle({ centre: to, radius: r });

    this.ctx.beginPath();

    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);

    this.ctx.stroke();
    this.ctx.closePath();
  }

  getRelativeMouse(rx: number, ry: number) {
    const { x, y } = this.canvas.getBoundingClientRect();
    return vec(rx - x, ry - y);
  }
}

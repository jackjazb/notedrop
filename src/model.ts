import type { Vec } from "./vec";

export type Dropper = {
  pos: Vec;
  timeout: number;
};

export type Ball = {
  pos: Vec;
  vel: Vec;
  acc: Vec;
};

export type SimulationParams = {
  /**
   * px/s^2
   */
  gravity: number;
  /**
   * The rate at which droppers drop
   */
  dropperTimeout: number;
};

export type Tool = "line" | "dropper";

export type ControlPanel = {
  tools: Record<Tool, HTMLInputElement>;
  settings: HTMLButtonElement;
  settingsPanel: HTMLDialogElement;
};

export type TouchOrMouseHandler = (
  e: TouchEvent | MouseEvent
) => Promise<void> | void;
export function isTouchEvent(e: object): e is TouchEvent {
  return "touches" in e && "changedTouches" in e;
}

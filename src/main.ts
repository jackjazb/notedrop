import { line } from "./line";
import { State } from "./state";
import { type Vec } from "./vec";

// Style import
import { setUpControlPanel } from "./panel";
import "./style.css";
import { isTouch } from "./utils";

/**
 * Sets up DOM events for manipulating the sim state.
 */
function setUpEventListeners(state: State) {
  const handleStart: TouchOrMouseHandler = async (e) => {
    let clickPos: Vec;
    if (isTouchEvent(e)) {
      clickPos = state.renderer.getRelativeMouse(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY
      );
    } else {
      clickPos = state.renderer.getRelativeMouse(e.clientX, e.clientY);
    }
    switch (state.tool) {
      case "line":
        state.currentLine = line(clickPos, clickPos);
        break;
      case "dropper":
        state.addDropper(clickPos);
        break;
    }
  };

  const handleMove: TouchOrMouseHandler = (e) => {
    if (state.currentLine) {
      let clickPos: Vec;
      if (isTouchEvent(e)) {
        clickPos = state.renderer.getRelativeMouse(
          e.changedTouches[0].clientX,
          e.changedTouches[0].clientY
        );
      } else {
        clickPos = state.renderer.getRelativeMouse(e.clientX, e.clientY);
      }
      state.currentLine.to = clickPos;
    }
  };

  const handleEnd: TouchOrMouseHandler = async (e) => {
    if (!state.currentLine) {
      return;
    }
    let clickPos: Vec;
    if (isTouchEvent(e)) {
      clickPos = state.renderer.getRelativeMouse(
        e.changedTouches[0].clientX,
        e.changedTouches[0].clientY
      );
    } else {
      clickPos = state.renderer.getRelativeMouse(e.clientX, e.clientY);
    }
    state.currentLine.to = clickPos;
    state.addCurrentLine();
    await state.sampler.init();
  };

  if (isTouch()) {
    state.renderer.canvas.ontouchstart = handleStart;
    document.ontouchmove = handleMove;
    document.ontouchend = handleEnd;
  } else {
    state.renderer.canvas.onmousedown = handleStart;
    document.onmousemove = handleMove;
    document.onmouseup = handleEnd;
  }

  window.onresize = () => {
    state.renderer.resize(window.innerWidth, window.innerHeight);
  };

  window.onblur = () => {
    state.sampler.mute(true);
  };
  window.onfocus = () => {
    state.sampler.mute(false);
  };
}

let now = performance.now();
let delta = 0;
let last = now;

// Allowed ms per frame - see https://gafferongames.com/post/fix_your_timestep/
const timeStep = 1000 / 240;

function loop(state: State) {
  now = performance.now();
  delta = now - last;
  last = now;
  let acc = delta;

  while (acc >= timeStep) {
    state.update(timeStep);
    acc -= timeStep;
  }

  state.render();

  // Call next loop
  requestAnimationFrame(() => loop(state));
}

const initialState = new State();

initialState.loadFromUrl();

setUpEventListeners(initialState);
setUpControlPanel(initialState);

loop(initialState);
export type TouchOrMouseHandler = (
  e: TouchEvent | MouseEvent
) => Promise<void> | void;
export function isTouchEvent(e: object): e is TouchEvent {
  return "touches" in e && "changedTouches" in e;
}

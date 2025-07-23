import type { State } from "./state";

export function simulate(state: State, frames: number) {
  const output = document.createElement('pre');
  document.body.appendChild(output);
  state.sim.dropperTimeout = 0;
  let out = '';
  const data: Record<string, number[]> = {};
  for (const [i] of Array(frames).entries()) {
    state.update();

    state.render();

    for (const [i, b] of state.balls.entries()) {
      if (!data[i]) {
        data[i] = [];
      }
      data[i].push(b.vel.mag());
    }
  }
  output.textContent = JSON.stringify(data, undefined, 2);
}
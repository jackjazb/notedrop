import { Vec, vec } from "./vec";

export function canvasMousePos(client: Vec, canvas: HTMLCanvasElement): Vec {
  const { x, y } = canvas.getBoundingClientRect();
  return vec(client.x - x, client.y - y);
}

export function radToDeg(rad: number): number {
  return 180 * (rad / Math.PI);
}

export function jsonTable(json: Record<string, number>) {
  const padding = Math.max(...Object.keys(json).map((k) => k.length));
  let res = "";
  for (const [k, v] of Object.entries(json)) {
    res += `${k.padEnd(padding)} : ${v.toFixed(2)}\n`;
  }
  return res;
}

export function isTouch() {
  return "ontouchstart" in window;
}

export async function setClipboard(text: string) {
  const type = "text/plain";
  const clipboardItemData = {
    [type]: text,
  };
  const clipboardItem = new ClipboardItem(clipboardItemData);
  await navigator.clipboard.write([clipboardItem]);
}
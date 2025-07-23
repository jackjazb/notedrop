import m from 'mithril';
import type { Tool } from "./model";
import type { State } from "./state";

// Raw asset imports
import dropperIcon from './assets/dropper.svg?raw';
import lineIcon from './assets/line.svg?raw';
import settingsIcons from './assets/settings.svg?raw';
import undoIcon from './assets/undo.svg?raw';
import { isTouch } from './utils';

const ShowInitModal = false;

/**
 * The tool selection radio buttons.
 */
const ToolPicker: m.Component<{ tool: Tool; state: State; }> = {
  view: (vnode) => {
    const { tool, state } = vnode.attrs;
    const toolIcons: Record<Tool, string> = {
      'line': lineIcon,
      'dropper': dropperIcon
    };

    return m("label", { class: 'btn square' }, [
      m("input", {
        type: "radio",
        name: "tool",
        checked: state.tool === tool,
        onclick: () => state.tool = tool
      },),
      m.trust(toolIcons[tool]),
    ]);
  }
};

const Modal: m.Component<{ title?: string; closeLabel?: string; }> = {
  view: (vnode) => {
    const { title, closeLabel } = vnode.attrs;
    return m("dialog", { autofocus: true }, [
      title ? m("h1", title) : undefined,
      vnode.children,
      m("form", { method: "dialog" }, [
        m("button", { class: "btn" }, closeLabel ?? "OK")
      ])
    ]);
  }
};
/**
 * The settings button and accompanying modal.
 */
const SettingsModal: m.Component<{ state: State; }> = {
  view: (vnode) => {
    const { state } = vnode.attrs;
    const modal = m(Modal, { title: "Options" }, [
      m("div", { class: "form" }, [
        m("label", { for: "gravity" }, "Gravity",
          m("input", {
            name: "gravity",
            type: "range",
            min: 0,
            max: 1000,
            value: state.sim.gravity,
            oninput: (e: Event) => {
              state.sim.gravity = parseFloat((e.currentTarget as HTMLInputElement).value);
            }
          }),),
      ])
    ]) as m.VnodeDOM;
    return [
      m("button", {
        class: 'btn square',
        onclick: () => (modal.dom as HTMLDialogElement).showModal()
      }, [
        m.trust(settingsIcons)
      ]), modal];
  }
};

/**
 * Modal shown on startup.
 */
const InitModal: m.Component = {
  oncreate: (vnode: m.VnodeDOM) => {
    if (ShowInitModal) {
      (vnode.dom as HTMLDialogElement).showModal();

    }
  },
  view: () => {
    const text = isTouch() ?
      "Tap and drag to draw lines" :
      "Click and drag to draw lines";
    return m(Modal, { title: 'Welcome to Notedrop!', closeLabel: 'Get started' }, [
      m("ul", [
        m("li", text),
        m("li", "Select tools and play with settings on the left")
      ])
    ]);
  }
};

/**
 * The root panel component.
 */
const Panel: m.Component<{ state: State; }> = {
  view: ({ attrs: { state } }) => {
    return [
      m(ToolPicker, { tool: 'line', state }),
      m(ToolPicker, { tool: 'dropper', state }),
      m("button", { class: 'btn square', onclick: () => state.saveToLocal() }, "save"),
      m("button", { class: 'btn square', onclick: () => state.undo() }, [
        m.trust(undoIcon)
      ]),
      m("hr"),
      m(SettingsModal, { state }),
      m(InitModal)
    ];
  }
};
/**
 * Adds necessary button event listeners.
 */
export function setUpControlPanel(state: State) {
  const panelRoot = document.querySelector('#panel');
  if (!panelRoot) {
    throw new Error('Missing control panel root element');
  }

  m.mount(panelRoot, { view: () => m(Panel, { state }) });
}

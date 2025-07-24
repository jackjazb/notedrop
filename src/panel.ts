import m from "mithril";
import type { SimulationParams, Tool } from "./model";
import { DefaultSimulationSettings, type State } from "./state";

// Raw asset imports
import dropperIcon from "./assets/dropper.svg?raw";
import lineIcon from "./assets/line.svg?raw";
import settingsIcons from "./assets/settings.svg?raw";
import undoIcon from "./assets/undo.svg?raw";
import { Notes, Scales, type Note, type ScaleType } from "./sampler";
import { isTouch } from "./utils";

/**
 * A reusable modal component.
 */
const Modal: m.Component<{
  title?: string;
  closeLabel?: string;
  open?: boolean;
}> = {
  oncreate: (vnode) => {
    if (vnode.attrs.open) {
      (vnode.dom as HTMLDialogElement).showModal();
    }
  },
  view: (vnode) => {
    const { title, closeLabel } = vnode.attrs;
    return m("dialog", { autofocus: true }, [
      title ? m("h1", title) : undefined,
      vnode.children,
      m("form", { method: "dialog" }, [
        m("button", { class: "btn" }, closeLabel ?? "OK"),
      ]),
    ]);
  },
};

/**
 * Tool selection radio buttons.
 */
const ToolPicker: m.Component<{ tool: Tool; state: State }> = {
  view: (vnode) => {
    const { tool, state } = vnode.attrs;
    const toolIcons: Record<Tool, string> = {
      line: lineIcon,
      dropper: dropperIcon,
    };

    return m("label", { class: "btn square" }, [
      m("input", {
        type: "radio",
        name: "tool",
        checked: state.tool === tool,
        onclick: () => (state.tool = tool),
      }),
      m.trust(toolIcons[tool]),
    ]);
  },
};

/**
 * A select for root note and scale type.
 */
const ScalePicker: m.ClosureComponent<{ state: State }> = () => {
  return {
    view: (vnode) => {
      const { state } = vnode.attrs;
      return m("span", { class: "flex-row" }, [
        m(
          "select",
          {
            onchange: (e: Event) =>
              state.sampler.setRootNote(
                (e.target as HTMLSelectElement).value as Note
              ),
          },
          Notes.map((n) => m("option", n))
        ),
        m(
          "select",
          {
            onchange: (e: Event) =>
              state.sampler.setScaleType(
                (e.target as HTMLSelectElement).value as ScaleType
              ),
          },
          Object.keys(Scales).map((n) => m("option", n))
        ),
      ]);
    },
  };
};

/**
 * Component for manipulating a SimulationParam.
 */
const SimSettingSlider: m.Component<{
  state: State;
  simKey: keyof SimulationParams;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = {
  view: (vnode) => {
    const { state, simKey: key, label, min, max, step } = vnode.attrs;
    return [
      m("label", label),
      m("input", {
        type: "range",
        min,
        step,
        max,
        value: state.sim[key],
        oninput: (e: Event) => {
          state.sim[key] = parseFloat(
            (e.currentTarget as HTMLInputElement).value
          );
        },
      }),
    ];
  },
};

/**
 * The settings panel.
 */
const SettingsModal: m.Component<{ state: State }> = {
  view: (vnode) => {
    const { state } = vnode.attrs;
    return m(Modal, { open: false }, [
      m("div", { class: "flex-col" }, [
        m(
          "h1",
          { class: "flex-row m-0" },
          "Options",
          m(
            "button",
            {
              class: "btn ml-auto",
              onclick: () => (state.sim = { ...DefaultSimulationSettings }),
            },
            "reset"
          )
        ),

        m("div", { class: "settings" }, [
          m(SimSettingSlider, {
            simKey: "gravity",
            label: "Gravity",
            state,
            min: 0.01,
            max: 3,
            step: 0.01,
          }),
          m(SimSettingSlider, {
            simKey: "bounce",
            label: "Bounce",
            state,
            min: 0.01,
            max: 2,
            step: 0.01,
          }),
          m(SimSettingSlider, {
            simKey: "dropperTimeout",
            label: "Dropper delay",
            state,
            min: 100,
            max: 2000,
          }),
          m("label", "Scale"),
          m(ScalePicker, { state }),
        ]),
      ]),
    ]);
  },
};

/**
 * The button that shows the settings panel.
 */
const SettingsModalButton: m.Component<{ state: State }> = {
  view: (vnode) => {
    const { state } = vnode.attrs;
    const modal = m(SettingsModal, { state }) as m.VnodeDOM<{ state: State }>;
    return [
      m(
        "button",
        {
          class: "btn square",
          onclick: () => (modal.dom as HTMLDialogElement).showModal(),
        },
        [m.trust(settingsIcons)]
      ),
      modal,
    ];
  },
};

/**
 * Modal shown on startup.
 */
const InitModal: m.Component = {
  view: () => {
    const text = isTouch()
      ? "Tap and drag to draw lines"
      : "Click and drag to draw lines";
    return m(
      Modal,
      {
        title: "Welcome to Notedrop!",
        closeLabel: "Get started",
        open: true,
      },
      [
        m("ul", [
          m("li", text),
          m("li", "Select tools and play with settings on the left"),
        ]),
      ]
    );
  },
};

/**
 * The root panel component.
 */
const Panel: m.Component<{ state: State }> = {
  view: ({ attrs: { state } }) => {
    return [
      m(ToolPicker, { tool: "line", state }),
      m(ToolPicker, { tool: "dropper", state }),
      m(
        "button",
        { class: "btn square", onclick: () => state.saveToLocal() },
        "save"
      ),
      m("button", { class: "btn square", onclick: () => state.undo() }, [
        m.trust(undoIcon),
      ]),
      m("hr"),
      m(SettingsModalButton, { state }),
      m(InitModal),
    ];
  },
};
/**
 * Adds necessary button event listeners.
 */
export function setUpControlPanel(state: State) {
  const panelRoot = document.querySelector("#panel");
  if (!panelRoot) {
    throw new Error("Missing control panel root element");
  }

  m.mount(panelRoot, { view: () => m(Panel, { state }) });
}

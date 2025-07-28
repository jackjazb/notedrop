import m, { trust } from "mithril";
import {
  Instruments,
  Notes,
  Scales,
  type Instrument,
  type Note,
  type ScaleType,
} from "./sampler";
import type { Tool } from "./state";
import { type CoreState, type State } from "./state";
import { isTouch, setClipboard } from "./utils";

// Raw asset imports
import dropperIcon from "./assets/dropper.svg?raw";
import lineIcon from "./assets/line.svg?raw";
import resetIcon from "./assets/reset.svg?raw";
import settingsIcons from "./assets/settings.svg?raw";
import undoIcon from "./assets/undo.svg?raw";
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
    return m(
      "dialog",
      { autofocus: true },
      title ? m("h1", title) : undefined,
      vnode.children,
      m("form", { method: "dialog" }, [
        m("button", { class: "btn" }, closeLabel ?? "Close"),
      ])
    );
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

    return m(
      "label",
      { class: "btn square" },
      m("input", {
        type: "radio",
        name: "tool",
        checked: state.tool === tool,
        onclick: () => (state.tool = tool),
      }),
      m.trust(toolIcons[tool])
    );
  },
};

/**
 * A select for root note and scale type.
 */
const ScalePicker: m.ClosureComponent<{ state: State }> = () => {
  return {
    view: (vnode) => {
      const { state } = vnode.attrs;
      return m(
        "span",
        { class: "flex-row" },
        m(
          "select",
          {
            onchange: (e: Event) => {
              const t = e.target as HTMLSelectElement;
              state.state.root = t.value as Note;
            },
          },
          Notes.map((n) =>
            m(
              "option",
              {
                selected: n === state.state.root,
              },
              n
            )
          )
        ),
        m(
          "select",
          {
            onchange: (e: Event) => {
              const t = e.target as HTMLSelectElement;
              state.state.scaleType = t.value as ScaleType;
            },
          },
          Object.keys(Scales).map((n) =>
            m(
              "option",
              {
                selected: n === state.state.scaleType,
                value: n,
              },
              n.replaceAll("_", " ")
            )
          )
        )
      );
    },
  };
};

/**
 * Component for manipulating a SimulationParam.
 */
const SimSettingSlider: m.Component<{
  state: State;
  setting: keyof Pick<CoreState, "gravity" | "dropperTimeout">;
  label: string;
  min: number;
  max: number;
  step?: number;
}> = {
  view: (vnode) => {
    const { state, setting, label, min, max, step } = vnode.attrs;
    return [
      m("label", label),
      m("input", {
        type: "range",
        min,
        step,
        max,
        value: state.state[setting],
        oninput: (e: Event) => {
          state.state[setting] = parseFloat(
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
const SettingsModal: m.ClosureComponent<{ state: State }> = () => {
  let showCopyConfirm = false;

  return {
    view: (vnode) => {
      const { state } = vnode.attrs;

      return m(
        Modal,
        { open: false },
        m(
          "div",
          { class: "flex-col" },
          m(
            "h1",
            { class: "flex-row m-0" },
            "Options",
            m(
              "button",
              {
                class: "btn icon ml-auto",
                onclick: () => state.clearSettings(),
              },
              trust(resetIcon)
            )
          ),

          m(
            "div",
            { class: "settings" },
            m(SimSettingSlider, {
              setting: "gravity",
              label: "Gravity",
              state,
              min: 0.01,
              max: 3,
              step: 0.01,
            }),

            m(SimSettingSlider, {
              setting: "dropperTimeout",
              label: "Dropper delay",
              state,
              min: 50,
              max: 1000,
            }),
            m("label", "Instrument"),
            m(
              "select",
              {
                onchange: (e: Event) =>
                  (state.state.instrument = (e.target as HTMLSelectElement)
                    .value as Instrument),
              },
              Instruments.map((inst) =>
                m(
                  "option",
                  { value: inst, selected: inst === state.state.instrument },
                  inst.replaceAll("_", " ")
                )
              )
            ),
            m("label", "Scale"),
            m(ScalePicker, { state })
          ),
          m(
            "span",
            { class: "flex-row mt-3" },
            m(
              "button",
              {
                class: "btn  ",
                onclick: async () => {
                  state.clearBoard();
                  window.history.pushState(null, "", "/");
                },
              },
              "❌ Clear"
            ),
            m(
              "button",
              {
                class: "btn ",
                onclick: async () => {
                  state.saveToUrl();
                  await setClipboard(window.location.href);
                  showCopyConfirm = true;
                  console.log(showCopyConfirm);
                  setTimeout(() => {
                    showCopyConfirm = false;

                    m.redraw();
                  }, 3000);
                },
              },
              "🎵 Share"
            ),
            showCopyConfirm ? m("span", "Copied!") : undefined
          )
        )
      );
    },
  };
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
        m.trust(settingsIcons)
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
        closeLabel: "🎵 Get started",
        open: true,
      },

      m(
        "ul",
        m("li", text),
        m("li", "Select tools and undo in the left panel"),
        m("li", "Share and more in the settings menu")
      )
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
        { class: "btn square", onclick: () => state.undo() },
        m.trust(undoIcon)
      ),
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

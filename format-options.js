const viewClassNames = ["view-grid", "view-codex", "view-compact"];
const pageLayoutClassNames = ["layout-sidebar", "layout-topbar", "layout-wide", "layout-focus"];
const presetClassNames = [
  "preset-tome",
  "preset-topbar",
  "preset-library",
  "preset-preview",
  "preset-blood",
  "preset-frost",
  "preset-forest",
  "preset-void",
  "preset-ember",
  "preset-royal",
  "preset-minimal",
  "preset-bone"
];
const themeClassNames = [
  "theme-abyss",
  "theme-blood",
  "theme-gold",
  "theme-frost",
  "theme-forest",
  "theme-void",
  "theme-ember",
  "theme-royal",
  "theme-ash",
  "theme-ocean",
  "theme-rose",
  "theme-bone"
];

const presetMap = {
  tome: { layout: "sidebar", view: "grid", theme: "abyss" },
  topbar: { layout: "topbar", view: "grid", theme: "gold" },
  library: { layout: "wide", view: "codex", theme: "bone" },
  preview: { layout: "focus", view: "grid", theme: "void" },
  blood: { layout: "sidebar", view: "compact", theme: "blood" },
  frost: { layout: "topbar", view: "codex", theme: "frost" },
  forest: { layout: "wide", view: "grid", theme: "forest" },
  void: { layout: "focus", view: "compact", theme: "void" },
  ember: { layout: "sidebar", view: "codex", theme: "ember" },
  royal: { layout: "topbar", view: "grid", theme: "royal" },
  minimal: { layout: "wide", view: "compact", theme: "ash" },
  bone: { layout: "sidebar", view: "grid", theme: "bone" }
};

const formatControls = document.querySelector("#formatControls");
const presetControls = document.querySelector("#presetControls");
const formatGrid = document.querySelector("#cardGrid");

function setIndexView(viewName, shouldSave = true) {
  const view = ["grid", "codex", "compact"].includes(viewName) ? viewName : "grid";
  if (!formatGrid) return;

  formatGrid.classList.remove(...viewClassNames);
  formatGrid.classList.add(`view-${view}`);

  document.querySelectorAll(".format-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  if (shouldSave) localStorage.setItem("cardFantasyIndexView", view);
}

function setPageLayout(layoutName) {
  const layout = ["sidebar", "topbar", "wide", "focus"].includes(layoutName) ? layoutName : "sidebar";
  document.body.classList.remove(...pageLayoutClassNames);
  document.body.classList.add(`layout-${layout}`);
}

function setTheme(themeName) {
  const theme = ["abyss", "blood", "gold", "frost", "forest", "void", "ember", "royal", "ash", "ocean", "rose", "bone"].includes(themeName) ? themeName : "abyss";
  document.body.classList.remove(...themeClassNames);
  document.body.classList.add(`theme-${theme}`);
}

function setPreset(presetName, shouldSave = true) {
  const preset = presetMap[presetName] ? presetName : "tome";
  const config = presetMap[preset];

  document.body.classList.remove(...presetClassNames);
  document.body.classList.add(`preset-${preset}`);
  setPageLayout(config.layout);
  setTheme(config.theme);
  setIndexView(config.view, false);

  document.querySelectorAll(".preset-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === preset);
  });

  if (shouldSave) localStorage.setItem("cardFantasyPreset", preset);
}

formatControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setIndexView(button.dataset.view);
});

presetControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset]");
  if (!button) return;
  setPreset(button.dataset.preset);
});

setPreset(localStorage.getItem("cardFantasyPreset") || "tome", false);
setIndexView(localStorage.getItem("cardFantasyIndexView") || presetMap[localStorage.getItem("cardFantasyPreset") || "tome"].view, false);

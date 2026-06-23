const viewClassNames = ["view-grid", "view-codex", "view-compact"];
const layoutClassNames = [
  "layout-tome",
  "layout-topdeck",
  "layout-atlas",
  "layout-preview-left",
  "layout-clean",
  "layout-split",
  "layout-wall",
  "layout-right-rail",
  "layout-archive",
  "layout-floating",
  "layout-minimal",
  "layout-codex"
];
const oldLayoutClassNames = ["layout-sidebar", "layout-topbar", "layout-wide", "layout-focus"];
const oldPresetClassNames = [
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

const validViews = ["grid", "codex", "compact"];
const validLayouts = [
  "tome",
  "topdeck",
  "atlas",
  "preview-left",
  "clean",
  "split",
  "wall",
  "right-rail",
  "archive",
  "floating",
  "minimal",
  "codex"
];
const validThemes = ["abyss", "blood", "gold", "frost", "forest", "void", "ember", "royal", "ash", "ocean", "rose", "bone"];

const formatControls = document.querySelector("#formatControls");
const layoutControls = document.querySelector("#layoutControls");
const themeControls = document.querySelector("#themeControls");
const settingsButton = document.querySelector("#settingsButton");
const settingsPanel = document.querySelector("#settingsPanel");
const settingsClose = document.querySelector("#settingsClose");
const formatGrid = document.querySelector("#cardGrid");

function setIndexView(viewName) {
  const view = validViews.includes(viewName) ? viewName : "grid";
  if (!formatGrid) return;

  formatGrid.classList.remove(...viewClassNames);
  formatGrid.classList.add(`view-${view}`);

  document.querySelectorAll(".format-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  localStorage.setItem("cardFantasyIndexView", view);
}

function setLayout(layoutName) {
  const layout = validLayouts.includes(layoutName) ? layoutName : "tome";
  document.body.classList.remove(...layoutClassNames, ...oldLayoutClassNames, ...oldPresetClassNames);
  document.body.classList.add(`layout-${layout}`);

  document.querySelectorAll(".layout-choice").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === layout);
  });

  localStorage.setItem("cardFantasyLayout", layout);
}

function setTheme(themeName) {
  const theme = validThemes.includes(themeName) ? themeName : "abyss";
  document.body.classList.remove(...themeClassNames);
  document.body.classList.add(`theme-${theme}`);

  document.querySelectorAll(".theme-choice").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === theme);
  });

  localStorage.setItem("cardFantasyTheme", theme);
}

function openSettings() {
  settingsPanel?.classList.add("is-open");
  settingsPanel?.setAttribute("aria-hidden", "false");
}

function closeSettings() {
  settingsPanel?.classList.remove("is-open");
  settingsPanel?.setAttribute("aria-hidden", "true");
}

formatControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setIndexView(button.dataset.view);
});

layoutControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-layout]");
  if (!button) return;
  setLayout(button.dataset.layout);
});

themeControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  setTheme(button.dataset.theme);
});

settingsButton?.addEventListener("click", openSettings);
settingsClose?.addEventListener("click", closeSettings);
settingsPanel?.addEventListener("click", (event) => {
  if (event.target === settingsPanel) closeSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSettings();
});

setLayout(localStorage.getItem("cardFantasyLayout") || "tome");
setTheme(localStorage.getItem("cardFantasyTheme") || "abyss");
setIndexView(localStorage.getItem("cardFantasyIndexView") || "grid");

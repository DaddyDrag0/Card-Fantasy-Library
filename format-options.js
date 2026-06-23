const viewClassNames = ["view-grid", "view-codex", "view-compact"];
const pageLayoutClassNames = ["layout-sidebar", "layout-topbar", "layout-wide", "layout-focus"];
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

const formatControls = document.querySelector("#formatControls");
const pageLayoutControls = document.querySelector("#pageLayoutControls");
const themeControls = document.querySelector("#themeControls");
const formatGrid = document.querySelector("#cardGrid");

function setIndexView(viewName) {
  const view = ["grid", "codex", "compact"].includes(viewName) ? viewName : "grid";
  if (!formatGrid) return;

  formatGrid.classList.remove(...viewClassNames);
  formatGrid.classList.add(`view-${view}`);

  document.querySelectorAll(".format-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  localStorage.setItem("cardFantasyIndexView", view);
}

function setPageLayout(layoutName) {
  const layout = ["sidebar", "topbar", "wide", "focus"].includes(layoutName) ? layoutName : "sidebar";
  document.body.classList.remove(...pageLayoutClassNames);
  document.body.classList.add(`layout-${layout}`);

  document.querySelectorAll(".layout-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.layout === layout);
  });

  localStorage.setItem("cardFantasyPageLayout", layout);
}

function setTheme(themeName) {
  const theme = ["abyss", "blood", "gold", "frost", "forest", "void", "ember", "royal", "ash", "ocean", "rose", "bone"].includes(themeName) ? themeName : "abyss";
  document.body.classList.remove(...themeClassNames);
  document.body.classList.add(`theme-${theme}`);

  document.querySelectorAll(".style-option").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === theme);
  });

  localStorage.setItem("cardFantasyTheme", theme);
}

formatControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setIndexView(button.dataset.view);
});

pageLayoutControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-layout]");
  if (!button) return;
  setPageLayout(button.dataset.layout);
});

themeControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme]");
  if (!button) return;
  setTheme(button.dataset.theme);
});

setIndexView(localStorage.getItem("cardFantasyIndexView") || "grid");
setPageLayout(localStorage.getItem("cardFantasyPageLayout") || "sidebar");
setTheme(localStorage.getItem("cardFantasyTheme") || "abyss");

const viewClassNames = ["view-grid", "view-codex", "view-compact"];
const pageLayoutClassNames = ["layout-sidebar", "layout-topbar", "layout-wide", "layout-focus"];
const formatControls = document.querySelector("#formatControls");
const pageLayoutControls = document.querySelector("#pageLayoutControls");
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

setIndexView(localStorage.getItem("cardFantasyIndexView") || "grid");
setPageLayout(localStorage.getItem("cardFantasyPageLayout") || "sidebar");

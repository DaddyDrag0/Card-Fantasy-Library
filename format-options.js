const viewClassNames = ["view-grid", "view-codex", "view-compact"];
const formatControls = document.querySelector("#formatControls");
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

formatControls?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setIndexView(button.dataset.view);
});

setIndexView(localStorage.getItem("cardFantasyIndexView") || "grid");

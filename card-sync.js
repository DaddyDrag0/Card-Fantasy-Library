const CardFantasyStatSync = (() => {
  const DATA_MANIFEST = "data/cards.json";
  const cardMap = new Map();
  let syncQueued = false;

  function cleanNumber(value) {
    return String(value || "").replace(/[^0-9.]/g, "");
  }

  function formatNumber(value) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    return Math.floor(value).toLocaleString();
  }

  function currentBorderMultiplier() {
    return [...document.querySelectorAll(".modifier-button.is-active small")].reduce((mult, small) => {
      const chance = Number(cleanNumber(small.textContent));
      return Number.isFinite(chance) && chance > 0 ? mult * chance : mult;
    }, 1);
  }

  function calculateStats(card) {
    const odds = Number(card?.odds || 0) * currentBorderMultiplier();
    if (!odds) return { hp: 0, atk: 0 };

    const rawHP = Math.floor(Math.pow(2, Math.log10(odds)) * 20);
    const rawATK = Math.floor(rawHP / 3);
    const weatherMult = Number(card?.statMult || 1) || 1;

    return {
      hp: Math.floor(rawHP * weatherMult),
      atk: Math.floor(rawATK * weatherMult)
    };
  }

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} failed`);
    return response.json();
  }

  async function loadCards() {
    try {
      const data = await fetchJSON(DATA_MANIFEST);
      const parts = Array.isArray(data.parts) ? data.parts : [];
      const partResults = await Promise.allSettled(parts.map(fetchJSON));
      const cards = partResults.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        return Array.isArray(result.value.cards) ? result.value.cards : [];
      });

      cards.forEach((card) => {
        if (Number(card?.odds) > 0) cardMap.set(card.id, card);
      });
    } catch (error) {
      console.warn("Card stat sync could not load card data", error);
    }
  }

  function syncPreviewRows() {
    const hpLabel = document.querySelector("#previewBaseHP")?.closest("div")?.querySelector("dt");
    const atkLabel = document.querySelector("#previewBaseATK")?.closest("div")?.querySelector("dt");
    const currentHP = document.querySelector("#previewCurrentHP")?.textContent || "—";
    const currentATK = document.querySelector("#previewCurrentATK")?.textContent || "—";
    const shownHP = document.querySelector("#previewBaseHP");
    const shownATK = document.querySelector("#previewBaseATK");

    document.querySelectorAll(".sync-hidden-row").forEach((row) => {
      row.hidden = true;
      row.style.display = "none";
    });

    if (hpLabel && hpLabel.textContent !== "HP") hpLabel.textContent = "HP";
    if (atkLabel && atkLabel.textContent !== "ATK") atkLabel.textContent = "ATK";
    if (shownHP && shownHP.textContent !== currentHP) shownHP.textContent = currentHP;
    if (shownATK && shownATK.textContent !== currentATK) shownATK.textContent = currentATK;
  }

  function syncCardTiles() {
    document.querySelectorAll(".card-tile[data-id]").forEach((tile) => {
      const card = cardMap.get(tile.dataset.id);
      if (!card) return;

      const stats = calculateStats(card);
      const statLine = tile.querySelector(".card-stat");
      if (!statLine) return;

      const nextText = `HP: ${formatNumber(stats.hp)} • ATK: ${formatNumber(stats.atk)}`;
      if (statLine.textContent !== nextText) statLine.textContent = nextText;
    });
  }

  function syncAll() {
    syncQueued = false;
    syncPreviewRows();
    syncCardTiles();
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(syncAll);
  }

  function watchPage() {
    const observer = new MutationObserver(queueSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"]
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest(".modifier-button, .card-tile, .filter-pill, .format-option")) {
        setTimeout(queueSync, 0);
      }
    });
  }

  async function init() {
    await loadCards();
    watchPage();
    syncAll();
  }

  init();
})();

const fallbackData = {
  meta: {
    counts: { cards: 0, weatherCards: 0, variants: 0 },
    variants: [],
    variantCombos: [],
    notes: []
  },
  cards: []
};

const state = {
  data: fallbackData,
  cards: [],
  activeSection: "cards",
  activeTier: "all",
  query: "",
  selectedId: null
};

const sectionTitles = {
  cards: "All Cards",
  weather: "Weather Cards",
  variants: "Variant System",
  calculator: "Chance Calculator"
};

const sectionLabels = {
  cards: "Cards",
  weather: "Weather",
  variants: "Shiny • Diamond • Radiant",
  calculator: "Coming later"
};

const cardGrid = document.querySelector("#cardGrid");
const searchInput = document.querySelector("#searchInput");
const resultCount = document.querySelector("#resultCount");
const activeSectionTitle = document.querySelector("#activeSectionTitle");
const activeSectionLabel = document.querySelector("#activeSectionLabel");
const previewCard = document.querySelector("#previewCard");
const previewArt = document.querySelector("#previewArt");
const previewName = document.querySelector("#previewName");
const previewMeta = document.querySelector("#previewMeta");
const previewOdds = document.querySelector("#previewOdds");
const previewAbility = document.querySelector("#previewAbility");
const previewSource = document.querySelector("#previewSource");
const previewImageId = document.querySelector("#previewImageId");
const previewVariants = document.querySelector("#previewVariants");
const copyCardButton = document.querySelector("#copyCardButton");
const tierFilters = document.querySelector("#tierFilters");

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function formatNumber(value) {
  if (value === null || value === undefined || Number(value) <= 0) return "Not rollable";
  return Number(value).toLocaleString();
}

function robloxImageUrl(imageId, size = 420) {
  if (!imageId) return "";
  return `https://www.roblox.com/asset-thumbnail/image?assetId=${encodeURIComponent(imageId)}&width=${size}&height=${size}&format=png`;
}

function getSearchBlob(item) {
  return normalize([
    item.name,
    item.tier,
    item.oddsLabel,
    item.ability,
    item.abilityType,
    item.abilityDescription,
    item.source,
    item.weather,
    item.imageId,
    ...(item.variants || [])
  ].join(" "));
}

function getVisibleCards() {
  const query = normalize(state.query);

  return state.cards.filter((item) => {
    const matchesSection = state.activeSection === "cards" || (state.activeSection === "weather" && item.weather);
    const matchesTier = state.activeTier === "all" || item.tier === state.activeTier;
    const matchesQuery = !query || getSearchBlob(item).includes(query);
    return matchesSection && matchesTier && matchesQuery;
  });
}

function setTierFiltersVisible(isVisible) {
  tierFilters.style.display = isVisible ? "flex" : "none";
}

function renderStats() {
  const counts = state.data.meta?.counts || {};
  document.querySelector("#totalCards").textContent = counts.cards ?? state.cards.length;
  document.querySelector("#totalWeather").textContent = counts.weatherCards ?? state.cards.filter((card) => card.weather).length;
  document.querySelector("#totalVariants").textContent = state.data.meta?.variants?.length ?? 0;
}

function cardTileHTML(item) {
  const image = item.imageId ? `<img src="${robloxImageUrl(item.imageId, 420)}" alt="" loading="lazy" onerror="this.parentElement.classList.remove('has-image'); this.remove();">` : "";
  const artClass = item.imageId ? "card-art has-image" : "card-art";
  const weather = item.weather ? `<span class="card-tag">${escapeHTML(item.weather)}</span>` : "";

  return `
    <button class="card-tile ${item.id === state.selectedId ? "is-selected" : ""}" type="button" data-id="${escapeHTML(item.id)}" style="--rarity-color: ${escapeHTML(item.color || "#d8b24e")}">
      <span class="${artClass}" aria-hidden="true">
        ${image}
        <span class="fallback-symbol">✦</span>
      </span>
      <span class="tile-topline">
        <span class="card-meta">${escapeHTML(item.tier || "Unknown")}</span>
        ${weather}
      </span>
      <h3>${escapeHTML(item.name)}</h3>
      <span class="card-stat">Odds: ${escapeHTML(item.oddsLabel || `1/${formatNumber(item.odds)}`)}</span>
      <span class="card-stat">${escapeHTML(item.abilityDescription || item.ability || "No ability listed")}</span>
    </button>
  `;
}

function renderCardGrid() {
  const items = getVisibleCards();
  activeSectionTitle.textContent = sectionTitles[state.activeSection] || "Cards";
  activeSectionLabel.textContent = sectionLabels[state.activeSection] || "Cards";
  resultCount.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;
  setTierFiltersVisible(true);

  if (!items.length) {
    cardGrid.innerHTML = `<div class="empty-state">No cards match that search/filter.</div>`;
    return;
  }

  cardGrid.innerHTML = items.map(cardTileHTML).join("");
}

function renderVariants() {
  const variants = state.data.meta?.variants || [];
  const combos = state.data.meta?.variantCombos || [];
  activeSectionTitle.textContent = "Variant System";
  activeSectionLabel.textContent = "Independent rolls";
  resultCount.textContent = `${variants.length} variants`;
  setTierFiltersVisible(false);

  cardGrid.innerHTML = `
    <article class="info-panel span-all">
      <p class="eyebrow">How variants work</p>
      <h3>Shiny, Diamond, and Radiant roll separately</h3>
      <p>These are not normal one-choice borders. A single card can roll none, one, two, or all three variants at the same time.</p>
    </article>
    ${variants.map((variant) => `
      <article class="variant-card" style="--rarity-color:${escapeHTML(variant.color || "#d8b24e")}">
        <div class="variant-gem">◇</div>
        <h3>${escapeHTML(variant.name)}</h3>
        <p>${escapeHTML(variant.chanceLabel || "Unknown chance")}</p>
        <span>${escapeHTML(variant.luckStat || "luck stat unknown")}</span>
        <span>Stat bonus: ${escapeHTML(variant.statBonus ?? "?")}</span>
      </article>
    `).join("")}
    <article class="info-panel span-all">
      <p class="eyebrow">Possible combinations</p>
      <div class="combo-list">
        ${combos.map((combo) => `<span>${escapeHTML(combo.name)}</span>`).join("")}
      </div>
    </article>
  `;

  selectVariantPreview();
}

function renderCalculatorSoon() {
  activeSectionTitle.textContent = "Chance Calculator";
  activeSectionLabel.textContent = "Coming after index";
  resultCount.textContent = "not built yet";
  setTierFiltersVisible(false);

  cardGrid.innerHTML = `
    <article class="info-panel span-all calc-soon">
      <p class="eyebrow">Coming later</p>
      <h3>Chance calculator is the next feature</h3>
      <p>Once the card index is finished, this can calculate the chance to get a card and include independent Shiny, Diamond, and Radiant variant rolls.</p>
      <p>For now, this page only reserves the spot in the left navigation.</p>
    </article>
  `;

  previewName.textContent = "Chance Calculator";
  previewMeta.textContent = "Reserved for the next feature after the card index is cleaned up.";
  previewArt.innerHTML = `<span>%</span>`;
  previewArt.className = "preview-art";
  previewOdds.textContent = "Later";
  previewAbility.textContent = "Card odds + variants";
  previewSource.textContent = "Not built yet";
  previewImageId.textContent = "—";
  previewVariants.innerHTML = "";
}

function renderCurrentSection() {
  if (state.activeSection === "variants") {
    renderVariants();
    return;
  }

  if (state.activeSection === "calculator") {
    renderCalculatorSoon();
    return;
  }

  renderCardGrid();
  const visible = getVisibleCards();
  if (!visible.some((card) => card.id === state.selectedId)) {
    selectItem(visible[0]?.id);
  }
}

function selectItem(id) {
  const item = state.cards.find((card) => card.id === id) || getVisibleCards()[0] || state.cards[0];
  if (!item) return;

  state.selectedId = item.id;
  previewCard.style.setProperty("--preview-color", item.color || "#d8b24e");

  const image = item.imageId ? `<img src="${robloxImageUrl(item.imageId, 720)}" alt="" onerror="this.parentElement.classList.remove('has-image'); this.remove();">` : "";
  previewArt.className = item.imageId ? "preview-art has-image" : "preview-art";
  previewArt.innerHTML = `${image}<span class="fallback-symbol">✦</span>`;

  previewName.textContent = item.name;
  previewMeta.textContent = item.abilityDescription || "No ability description found.";
  previewOdds.textContent = item.oddsLabel || `1/${formatNumber(item.odds)}`;
  previewAbility.textContent = item.ability || "—";
  previewSource.textContent = item.weather ? `${item.weather} weather` : item.source || "Base roll";
  previewImageId.textContent = item.imageId || "—";
  previewVariants.innerHTML = renderVariantChips(item.variants || []);

  if (state.activeSection !== "variants" && state.activeSection !== "calculator") {
    renderCardGrid();
  }
}

function renderVariantChips(variantNames) {
  const variants = state.data.meta?.variants || [];
  return variants
    .filter((variant) => variantNames.includes(variant.name))
    .map((variant) => `
      <span class="variant-chip" style="--chip-color:${escapeHTML(variant.color || "#d8b24e")}">
        ${escapeHTML(variant.name)} <small>${escapeHTML(variant.chanceLabel || "")}</small>
      </span>
    `)
    .join("");
}

function selectVariantPreview() {
  const variants = state.data.meta?.variants || [];
  previewCard.style.setProperty("--preview-color", "#d8b24e");
  previewArt.className = "preview-art";
  previewArt.innerHTML = `<span>◇</span>`;
  previewName.textContent = "Variant Rolls";
  previewMeta.textContent = "Each variant rolls independently, so combined variants are possible.";
  previewOdds.textContent = variants.map((v) => `${v.name}: ${v.chanceLabel}`).join(" • ") || "—";
  previewAbility.textContent = "Independent rolls";
  previewSource.textContent = "Card variant system";
  previewImageId.textContent = "Uses card imageId";
  previewVariants.innerHTML = renderVariantChips(variants.map((v) => v.name));
}

function setActiveSection(section) {
  state.activeSection = section;
  state.activeTier = "all";
  state.selectedId = null;

  document.querySelectorAll(".rail-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === section);
  });

  document.querySelectorAll(".filter-pill").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tier === "all");
  });

  renderCurrentSection();
}

function wireEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderCurrentSection();
  });

  document.querySelector("#sectionNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    setActiveSection(button.dataset.section);
  });

  document.querySelector("#tierFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-tier]");
    if (!button) return;
    state.activeTier = button.dataset.tier;
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill === button);
    });
    renderCurrentSection();
  });

  cardGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    selectItem(button.dataset.id);
  });

  copyCardButton.addEventListener("click", async () => {
    const item = state.cards.find((card) => card.id === state.selectedId);
    if (!item) return;

    try {
      await navigator.clipboard.writeText(item.name);
      copyCardButton.textContent = "Copied!";
      setTimeout(() => {
        copyCardButton.textContent = "Copy card name";
      }, 1200);
    } catch {
      copyCardButton.textContent = item.name;
    }
  });
}

async function loadData() {
  try {
    const response = await fetch("data/cards.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load data/cards.json");
    const data = await response.json();

    if (Array.isArray(data.parts)) {
      const partResponses = await Promise.all(data.parts.map(async (partPath) => {
        const partResponse = await fetch(partPath, { cache: "no-store" });
        if (!partResponse.ok) throw new Error(`Could not load ${partPath}`);
        return partResponse.json();
      }));

      data.cards = partResponses.flatMap((part) => Array.isArray(part.cards) ? part.cards : []);
    }

    state.data = data;
    state.cards = Array.isArray(data.cards) ? data.cards : [];
  } catch (error) {
    console.warn("Using fallback data:", error);
    state.data = fallbackData;
    state.cards = [];
  }
}

async function init() {
  await loadData();
  wireEvents();
  renderStats();
  renderCurrentSection();
}

init();

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
  activeSection: "index",
  activeWeather: "all",
  query: "",
  selectedId: null,
  selectedModifiers: new Set()
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
const previewBaseOdds = document.querySelector("#previewBaseOdds");
const previewCurrentOdds = document.querySelector("#previewCurrentOdds");
const previewAbility = document.querySelector("#previewAbility");
const previewSource = document.querySelector("#previewSource");
const previewImageId = document.querySelector("#previewImageId");
const modifierControls = document.querySelector("#modifierControls");
const copyCardButton = document.querySelector("#copyCardButton");
const weatherFilters = document.querySelector("#weatherFilters");

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

function titleCaseAbility(value) {
  const acronyms = new Map([
    ["hp", "HP"],
    ["atk", "ATK"],
    ["aoe", "AOE"],
    ["dr", "DR"]
  ]);

  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (acronyms.has(lower)) return acronyms.get(lower);
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ") || "—";
}

function formatNumber(value) {
  if (value === null || value === undefined || Number(value) <= 0) return "Not rollable";
  return Number(value).toLocaleString();
}

function formatOdds(value) {
  if (value === null || value === undefined || Number(value) <= 0) return "Not rollable";
  return `1/${formatNumber(value)}`;
}

function robloxImageCandidates(imageId, size = 420) {
  if (!imageId) return [];
  const id = encodeURIComponent(imageId);
  return [
    `https://assetdelivery.roblox.com/v1/asset?id=${id}`,
    `https://www.roblox.com/asset-thumbnail/image?assetId=${id}&width=${size}&height=${size}&format=png`
  ];
}

window.tryNextImage = function tryNextImage(img) {
  const candidates = (img.dataset.candidates || "").split("|").filter(Boolean);
  const nextIndex = Number(img.dataset.fallbackIndex || 0) + 1;

  if (candidates[nextIndex]) {
    img.dataset.fallbackIndex = String(nextIndex);
    img.src = candidates[nextIndex];
    return;
  }

  const parent = img.parentElement;
  if (parent) parent.classList.remove("has-image");
  img.remove();
};

function imageHTML(imageId, size = 420) {
  const candidates = robloxImageCandidates(imageId, size);
  if (!candidates.length) return "";
  return `<img src="${escapeHTML(candidates[0])}" data-candidates="${escapeHTML(candidates.join("|"))}" data-fallback-index="0" alt="" loading="lazy" onerror="tryNextImage(this)">`;
}

function getSearchBlob(item) {
  return normalize([
    item.name,
    item.oddsLabel,
    item.ability,
    titleCaseAbility(item.ability),
    item.abilityType,
    titleCaseAbility(item.abilityType),
    item.abilityDescription,
    item.source,
    item.weather || "Base",
    item.imageId,
    ...(item.variants || [])
  ].join(" "));
}

function getWeatherName(item) {
  return item.weather || "Base";
}

function getVisibleCards() {
  const query = normalize(state.query);

  return state.cards.filter((item) => {
    const matchesWeather = state.activeWeather === "all" || getWeatherName(item) === state.activeWeather;
    const matchesQuery = !query || getSearchBlob(item).includes(query);
    return matchesWeather && matchesQuery;
  });
}

function getSelectedCard() {
  return state.cards.find((card) => card.id === state.selectedId) || getVisibleCards()[0] || state.cards[0] || null;
}

function modifierColorList() {
  const variants = state.data.meta?.variants || [];
  const selected = variants.filter((variant) => state.selectedModifiers.has(variant.name));
  const colors = selected.map((variant) => variant.color || "#d8b24e");
  if (!colors.length) return "";
  if (colors.length === 1) return `${colors[0]}, ${colors[0]}, ${colors[0]}`;
  return `${colors.join(", ")}, ${colors[0]}`;
}

function currentOdds(card) {
  if (!card || !Number(card.odds)) return 0;

  const variants = state.data.meta?.variants || [];
  return variants.reduce((odds, variant) => {
    if (!state.selectedModifiers.has(variant.name)) return odds;
    return odds * Number(variant.chance || 1);
  }, Number(card.odds));
}

function setModifierBorderVars(element) {
  const colors = modifierColorList();
  element.classList.toggle("has-modifiers", Boolean(colors));
  if (colors) {
    element.style.setProperty("--modifier-colors", colors);
  } else {
    element.style.removeProperty("--modifier-colors");
  }
}

function renderStats() {
  const counts = state.data.meta?.counts || {};
  document.querySelector("#totalCards").textContent = counts.cards ?? state.cards.length;
  document.querySelector("#totalWeather").textContent = counts.weatherCards ?? state.cards.filter((card) => card.weather).length;
  document.querySelector("#totalVariants").textContent = state.data.meta?.variants?.length ?? 0;
}

function renderWeatherFilters() {
  const weatherNames = ["all", "Base", ...new Set(state.cards.map((card) => card.weather).filter(Boolean))];
  weatherFilters.innerHTML = weatherNames.map((name) => {
    const label = name === "all" ? "All" : name;
    return `<button class="filter-pill ${state.activeWeather === name ? "is-active" : ""}" type="button" data-weather="${escapeHTML(name)}">${escapeHTML(label)}</button>`;
  }).join("");
}

function cardTileHTML(item) {
  const isSelected = item.id === state.selectedId;
  const artClass = item.imageId ? "card-art has-image" : "card-art";
  const image = imageHTML(item.imageId, 420);
  const weather = item.weather ? `<span class="card-tag">${escapeHTML(item.weather)}</span>` : "";
  const modifierClass = isSelected && state.selectedModifiers.size ? "has-modifiers" : "";
  const modifierStyle = isSelected && state.selectedModifiers.size ? `--modifier-colors:${escapeHTML(modifierColorList())};` : "";

  return `
    <button class="card-tile ${isSelected ? "is-selected" : ""} ${modifierClass}" type="button" data-id="${escapeHTML(item.id)}" style="--rarity-color: ${escapeHTML(item.color || "#d8b24e")}; ${modifierStyle}">
      <span class="${artClass}" aria-hidden="true">
        ${image}
        <span class="fallback-symbol">✦</span>
      </span>
      <span class="tile-topline">
        ${weather}
      </span>
      <h3>${escapeHTML(item.name)}</h3>
      <span class="card-stat">Odds: ${escapeHTML(item.oddsLabel || formatOdds(item.odds))}</span>
      <span class="card-stat">Source: ${escapeHTML(getWeatherName(item))}</span>
    </button>
  `;
}

function renderIndex() {
  const items = getVisibleCards();
  activeSectionTitle.textContent = "Index";
  activeSectionLabel.textContent = "Cards";
  resultCount.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;
  weatherFilters.style.display = "flex";

  if (!items.length) {
    cardGrid.innerHTML = `<div class="empty-state">No cards match that search/filter.</div>`;
    return;
  }

  cardGrid.innerHTML = items.map(cardTileHTML).join("");
}

function renderCalculatorSoon() {
  activeSectionTitle.textContent = "Chance Calculator";
  activeSectionLabel.textContent = "Coming later";
  resultCount.textContent = "not built yet";
  weatherFilters.style.display = "none";

  cardGrid.innerHTML = `
    <article class="info-panel span-all calc-soon">
      <p class="eyebrow">Coming later</p>
      <h3>Chance calculator is next</h3>
      <p>After the card index is cleaned up, this will calculate the chance to roll a specific card and combine it with independent Shiny, Diamond, and Radiant rolls.</p>
    </article>
  `;

  previewCard.classList.remove("has-modifiers");
  previewArt.className = "preview-art";
  previewArt.innerHTML = `<span class="fallback-symbol">%</span>`;
  previewName.textContent = "Chance Calculator";
  previewMeta.textContent = "Reserved for the next feature after the card index.";
  previewBaseOdds.textContent = "Later";
  previewCurrentOdds.textContent = "Later";
  previewAbility.textContent = "Card odds + modifiers";
  previewSource.textContent = "Not built yet";
  previewImageId.textContent = "—";
  renderModifierControls();
}

function renderCurrentSection() {
  if (state.activeSection === "calculator") {
    renderCalculatorSoon();
    return;
  }

  renderIndex();
  const visible = getVisibleCards();
  if (!visible.some((card) => card.id === state.selectedId)) {
    selectItem(visible[0]?.id);
  } else {
    updatePreview();
  }
}

function renderModifierControls() {
  const variants = state.data.meta?.variants || [];

  if (!variants.length) {
    modifierControls.innerHTML = `<span class="muted-small">No modifier data found.</span>`;
    return;
  }

  modifierControls.innerHTML = variants.map((variant) => {
    const active = state.selectedModifiers.has(variant.name);
    return `
      <button class="modifier-button ${active ? "is-active" : ""}" type="button" data-modifier="${escapeHTML(variant.name)}" style="--chip-color:${escapeHTML(variant.color || "#d8b24e")}">
        <span>${escapeHTML(variant.name)}</span>
        <small>${escapeHTML(variant.chanceLabel || "")}</small>
      </button>
    `;
  }).join("");
}

function updatePreview() {
  const item = getSelectedCard();
  if (!item) return;

  const image = imageHTML(item.imageId, 720);
  previewCard.style.setProperty("--preview-color", item.color || "#d8b24e");
  previewArt.className = item.imageId ? "preview-art has-image" : "preview-art";
  previewArt.innerHTML = `${image}<span class="fallback-symbol">✦</span>`;

  setModifierBorderVars(previewCard);
  setModifierBorderVars(previewArt);

  const selectedNames = [...state.selectedModifiers];
  const modifierText = selectedNames.length ? ` with ${selectedNames.join(" + ")}` : "";

  previewName.textContent = item.name + modifierText;
  previewMeta.textContent = item.abilityDescription || "No ability description found.";
  previewBaseOdds.textContent = item.oddsLabel || formatOdds(item.odds);
  previewCurrentOdds.textContent = formatOdds(currentOdds(item));
  previewAbility.textContent = titleCaseAbility(item.ability || item.abilityType);
  previewSource.textContent = item.weather ? `${item.weather} weather` : item.source || "Base roll";
  previewImageId.textContent = item.imageId || "—";
  renderModifierControls();
}

function selectItem(id) {
  const item = state.cards.find((card) => card.id === id) || getVisibleCards()[0] || state.cards[0];
  if (!item) return;
  state.selectedId = item.id;
  updatePreview();
  if (state.activeSection === "index") renderIndex();
}

function setActiveSection(section) {
  state.activeSection = section;
  state.selectedId = null;

  document.querySelectorAll(".rail-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === section);
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

  weatherFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-weather]");
    if (!button) return;
    state.activeWeather = button.dataset.weather;
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

  modifierControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-modifier]");
    if (!button) return;

    const modifier = button.dataset.modifier;
    if (state.selectedModifiers.has(modifier)) {
      state.selectedModifiers.delete(modifier);
    } else {
      state.selectedModifiers.add(modifier);
    }

    updatePreview();
    if (state.activeSection === "index") renderIndex();
  });

  copyCardButton.addEventListener("click", async () => {
    const item = getSelectedCard();
    if (!item) return;

    try {
      await navigator.clipboard.writeText(previewName.textContent || item.name);
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
  renderStats();
  renderWeatherFilters();
  wireEvents();
  renderModifierControls();
  renderCurrentSection();
}

init();

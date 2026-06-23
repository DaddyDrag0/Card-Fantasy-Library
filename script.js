const fallbackData = {
  meta: {
    counts: { cards: 0, weatherCards: 0, variants: 0 },
    variants: [],
    variantCombos: [],
    notes: []
  },
  cards: []
};

const NEUTRAL_CARD_COLOR = "#8c8170";
const MODIFIER_NAME_ORDER = ["Shiny", "Diamond", "Radiant"];

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
const previewBaseHP = document.querySelector("#previewBaseHP");
const previewBaseATK = document.querySelector("#previewBaseATK");
const previewCurrentHP = document.querySelector("#previewCurrentHP");
const previewCurrentATK = document.querySelector("#previewCurrentATK");
const previewBaseOdds = document.querySelector("#previewBaseOdds");
const previewCurrentOdds = document.querySelector("#previewCurrentOdds");
const previewAbility = document.querySelector("#previewAbility");
const previewSource = document.querySelector("#previewSource");
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
  return Math.floor(Number(value)).toLocaleString();
}

function formatOdds(value) {
  if (value === null || value === undefined || Number(value) <= 0) return "Not rollable";
  return `1/${formatNumber(value)}`;
}

function cardSymbol(item) {
  const text = `${item.name || ""} ${item.ability || ""} ${item.abilityType || ""} ${item.weather || ""}`.toLowerCase();
  if (text.includes("dragon") || text.includes("wyvern") || text.includes("drake")) return "◆";
  if (text.includes("mage") || text.includes("witch") || text.includes("spell") || text.includes("arcane")) return "✦";
  if (text.includes("king") || text.includes("lord") || text.includes("ruler") || text.includes("sovereign")) return "♛";
  if (text.includes("skeleton") || text.includes("bone") || text.includes("grave") || text.includes("death")) return "☠";
  if (text.includes("moon") || text.includes("lunar") || text.includes("night")) return "☽";
  if (text.includes("sun") || text.includes("solar") || text.includes("fire") || text.includes("ember") || text.includes("phoenix")) return "☼";
  if (text.includes("sea") || text.includes("water") || text.includes("kraken") || text.includes("deep")) return "≈";
  if (text.includes("wolf") || text.includes("bear") || text.includes("beast") || text.includes("panther")) return "◈";
  if (text.includes("shield") || text.includes("guardian") || text.includes("paladin") || text.includes("knight")) return "⬟";
  if (text.includes("poison") || text.includes("shroom") || text.includes("fungal") || text.includes("slime")) return "✣";
  return "✦";
}

function cardAccent(item) {
  const source = getWeatherName(item).toLowerCase();
  const name = `${item.name || ""} ${item.ability || ""} ${item.abilityType || ""}`.toLowerCase();

  if (source.includes("blizzard") || name.includes("ice") || name.includes("frost")) return "#58bff0";
  if (source.includes("blood") || name.includes("blood") || name.includes("vampire")) return "#d95858";
  if (source.includes("heat") || name.includes("fire") || name.includes("ember") || name.includes("phoenix")) return "#f08a45";
  if (source.includes("orc")) return "#7aa15a";
  if (source.includes("bandit")) return "#c19355";
  if (source.includes("slime") || name.includes("shroom") || name.includes("poison")) return "#66c477";
  if (source.includes("valhalla") || name.includes("heaven")) return "#e0c46a";
  if (name.includes("void") || name.includes("rift") || name.includes("abyss")) return "#9d63e6";
  if (name.includes("moon") || name.includes("lunar") || name.includes("night")) return "#8f96ff";
  return "#b69a62";
}

function generatedArtHTML(item) {
  return `
    <span class="generated-vignette"></span>
    <span class="generated-rune">${escapeHTML(cardSymbol(item))}</span>
    <span class="generated-name">${escapeHTML((item.name || "?").slice(0, 1))}</span>
  `;
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
    ...(item.variants || [])
  ].join(" "));
}

function getWeatherName(item) {
  return item.weather || "Base";
}

function getWeatherMultiplier(item) {
  const mult = Number(item?.statMult || 1);
  return Number.isFinite(mult) && mult > 0 ? mult : 1;
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

function selectedModifierNames() {
  const knownModifierNames = (state.data.meta?.variants || []).map((variant) => variant.name);
  const orderedNames = [...new Set([...MODIFIER_NAME_ORDER, ...knownModifierNames])];
  const selected = orderedNames.filter((name) => state.selectedModifiers.has(name));
  const extraSelected = [...state.selectedModifiers].filter((name) => !selected.includes(name));
  return [...selected, ...extraSelected];
}

function selectedVariantMultiplier() {
  const variants = state.data.meta?.variants || [];
  return variants.reduce((mult, variant) => {
    if (!state.selectedModifiers.has(variant.name)) return mult;
    return mult * Number(variant.chance || 1);
  }, 1);
}

function modifierColorList() {
  const variants = state.data.meta?.variants || [];
  const selectedNames = selectedModifierNames();
  const colors = selectedNames
    .map((name) => variants.find((variant) => variant.name === name)?.color || "#d8b24e");
  if (!colors.length) return "";
  if (colors.length === 1) return `${colors[0]}, ${colors[0]}, ${colors[0]}`;
  return `${colors.join(", ")}, ${colors[0]}`;
}

function adjustedOdds(card, includeModifiers = true) {
  if (!card || !Number(card.odds)) return 0;
  return Number(card.odds) * (includeModifiers ? selectedVariantMultiplier() : 1);
}

function cardStats(card, includeModifiers = true) {
  const odds = adjustedOdds(card, includeModifiers);
  if (!odds) return { hp: 0, atk: 0, rawHP: 0, rawATK: 0, odds: 0 };

  const rawHP = Math.floor(Math.pow(2, Math.log10(odds)) * 20);
  const rawATK = Math.floor(rawHP / 3);
  const weatherMult = getWeatherMultiplier(card);

  return {
    hp: Math.floor(rawHP * weatherMult),
    atk: Math.floor(rawATK * weatherMult),
    rawHP,
    rawATK,
    odds,
    weatherMult
  };
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
  const weather = item.weather ? `<span class="card-tag">${escapeHTML(item.weather)}</span>` : "";
  const modifierClass = isSelected && state.selectedModifiers.size ? "has-modifiers" : "";
  const modifierStyle = isSelected && state.selectedModifiers.size ? `--modifier-colors:${escapeHTML(modifierColorList())};` : "";
  const stats = cardStats(item, false);

  return `
    <button class="card-tile ${isSelected ? "is-selected" : ""} ${modifierClass}" type="button" data-id="${escapeHTML(item.id)}" style="--rarity-color: ${NEUTRAL_CARD_COLOR}; --card-accent: ${escapeHTML(cardAccent(item))}; ${modifierStyle}">
      <span class="card-art generated-art" aria-hidden="true">
        ${generatedArtHTML(item)}
      </span>
      <span class="tile-topline">
        ${weather}
      </span>
      <h3>${escapeHTML(item.name)}</h3>
      <span class="card-stat">HP: ${escapeHTML(formatNumber(stats.hp))} • ATK: ${escapeHTML(formatNumber(stats.atk))}</span>
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
  previewArt.className = "preview-art generated-art";
  previewArt.innerHTML = `<span class="generated-vignette"></span><span class="generated-rune">%</span>`;
  previewName.textContent = "Chance Calculator";
  previewMeta.textContent = "Reserved for the next feature after the card index.";
  previewBaseHP.textContent = "Later";
  previewBaseATK.textContent = "Later";
  previewCurrentHP.textContent = "Later";
  previewCurrentATK.textContent = "Later";
  previewBaseOdds.textContent = "Later";
  previewCurrentOdds.textContent = "Later";
  previewAbility.textContent = "Card odds + modifiers";
  previewSource.textContent = "Not built yet";
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

  previewCard.style.setProperty("--preview-color", NEUTRAL_CARD_COLOR);
  previewCard.style.setProperty("--card-accent", cardAccent(item));
  previewArt.className = "preview-art generated-art";
  previewArt.innerHTML = generatedArtHTML(item);

  setModifierBorderVars(previewCard);
  setModifierBorderVars(previewArt);

  const selectedNames = selectedModifierNames();
  const displayName = selectedNames.length ? `${selectedNames.join(" ")} ${item.name}` : item.name;
  const baseStats = cardStats(item, false);
  const currentStats = cardStats(item, true);
  const weatherText = getWeatherMultiplier(item) !== 1 ? ` • ${getWeatherMultiplier(item)}x weather stats` : "";

  previewName.textContent = displayName;
  previewMeta.textContent = item.abilityDescription || "No ability description found.";
  previewBaseHP.textContent = formatNumber(baseStats.hp);
  previewBaseATK.textContent = formatNumber(baseStats.atk);
  previewCurrentHP.textContent = formatNumber(currentStats.hp);
  previewCurrentATK.textContent = formatNumber(currentStats.atk);
  previewBaseOdds.textContent = item.oddsLabel || formatOdds(item.odds);
  previewCurrentOdds.textContent = formatOdds(currentStats.odds);
  previewAbility.textContent = titleCaseAbility(item.ability || item.abilityType);
  previewSource.textContent = (item.weather ? `${item.weather} weather` : item.source || "Base roll") + weatherText;
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

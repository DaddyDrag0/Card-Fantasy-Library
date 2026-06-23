const fallbackData = {
  meta: {
    counts: { cards: 0, weatherCards: 0, variants: 0 },
    variants: []
  },
  cards: []
};

const NEUTRAL_CARD_COLOR = "#8c8170";
const BORDER_NAME_ORDER = ["Shiny", "Diamond", "Radiant"];
const CARD_IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg"];
const MOBILE_PREVIEW_QUERY = "(max-width: 820px)";

const state = {
  data: fallbackData,
  cards: [],
  activeSection: "index",
  activeWeather: "all",
  query: "",
  selectedId: null,
  selectedBorders: new Set()
};

const cardGrid = document.querySelector("#cardGrid");
const searchInput = document.querySelector("#searchInput");
const resultCount = document.querySelector("#resultCount");
const activeSectionTitle = document.querySelector("#activeSectionTitle");
const previewArea = document.querySelector("#previewArea");
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
const previewClose = document.querySelector("#previewClose");
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

function isRollableCard(card) {
  return Number(card?.odds) > 0 && !String(card?.oddsLabel || "").toLowerCase().includes("not rollable");
}

function isMobilePreviewMode() {
  return window.matchMedia(MOBILE_PREVIEW_QUERY).matches;
}

function openPreviewModal() {
  if (!isMobilePreviewMode()) return;
  document.body.classList.add("preview-open");
}

function closePreviewModal() {
  document.body.classList.remove("preview-open");
}

function titleCaseAbility(value) {
  const acronyms = new Map([["hp", "HP"], ["atk", "ATK"], ["aoe", "AOE"], ["dr", "DR"]]);
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
  if (value === null || value === undefined || Number(value) <= 0) return "—";
  return Math.floor(Number(value)).toLocaleString();
}

function formatOdds(value) {
  if (value === null || value === undefined || Number(value) <= 0) return "—";
  return `1/${formatNumber(value)}`;
}

function getWeatherName(card) {
  return card?.weather || "Base";
}

function getWeatherMultiplier(card) {
  const mult = Number(card?.statMult || 1);
  return Number.isFinite(mult) && mult > 0 ? mult : 1;
}

function getImageCandidates(card) {
  const basePath = card.image || card.imagePath || `assets/cards/${card.id}`;
  if (/\.(png|webp|jpg|jpeg|gif)$/i.test(basePath)) return [basePath];
  return CARD_IMAGE_EXTENSIONS.map((ext) => `${basePath}.${ext}`);
}

window.tryNextCardImage = function tryNextCardImage(img) {
  const candidates = (img.dataset.candidates || "").split("|").filter(Boolean);
  const nextIndex = Number(img.dataset.fallbackIndex || 0) + 1;
  if (candidates[nextIndex]) {
    img.dataset.fallbackIndex = String(nextIndex);
    img.src = candidates[nextIndex];
    return;
  }
  img.parentElement?.classList.remove("has-card-image");
  img.remove();
};

window.cardImageLoaded = function cardImageLoaded(img) {
  img.parentElement?.classList.add("has-card-image");
};

function cardImageHTML(card) {
  const candidates = getImageCandidates(card);
  return `
    <span class="image-empty" aria-hidden="true"></span>
    <img class="card-real-image" src="${escapeHTML(candidates[0])}" data-candidates="${escapeHTML(candidates.join("|"))}" data-fallback-index="0" alt="" loading="lazy" onload="cardImageLoaded(this)" onerror="tryNextCardImage(this)">
  `;
}

function cardAccent(card) {
  const source = getWeatherName(card).toLowerCase();
  const name = `${card.name || ""} ${card.ability || ""} ${card.abilityType || ""}`.toLowerCase();
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

function getSearchBlob(card) {
  return normalize([
    card.name,
    card.oddsLabel,
    card.ability,
    titleCaseAbility(card.ability),
    card.abilityType,
    titleCaseAbility(card.abilityType),
    card.abilityDescription,
    card.source,
    card.weather || "Base",
    ...(card.variants || [])
  ].join(" "));
}

function getVisibleCards() {
  const query = normalize(state.query);
  return state.cards.filter((card) => {
    const matchesWeather = state.activeWeather === "all" || getWeatherName(card) === state.activeWeather;
    const matchesQuery = !query || getSearchBlob(card).includes(query);
    return matchesWeather && matchesQuery;
  });
}

function getSelectedCard() {
  return state.cards.find((card) => card.id === state.selectedId) || getVisibleCards()[0] || state.cards[0] || null;
}

function selectedBorderNames() {
  const knownNames = (state.data.meta?.variants || []).map((border) => border.name);
  const orderedNames = [...new Set([...BORDER_NAME_ORDER, ...knownNames])];
  const selected = orderedNames.filter((name) => state.selectedBorders.has(name));
  const extra = [...state.selectedBorders].filter((name) => !selected.includes(name));
  return [...selected, ...extra];
}

function selectedBorderMultiplier() {
  return (state.data.meta?.variants || []).reduce((mult, border) => {
    if (!state.selectedBorders.has(border.name)) return mult;
    return mult * Number(border.chance || 1);
  }, 1);
}

function borderColorList() {
  const borders = state.data.meta?.variants || [];
  const colors = selectedBorderNames().map((name) => borders.find((border) => border.name === name)?.color || "#d8b24e");
  if (!colors.length) return "";
  if (colors.length === 1) return `${colors[0]}, ${colors[0]}, ${colors[0]}`;
  return `${colors.join(", ")}, ${colors[0]}`;
}

function adjustedOdds(card, includeBorders = true) {
  if (!card || !Number(card.odds)) return 0;
  return Number(card.odds) * (includeBorders ? selectedBorderMultiplier() : 1);
}

function cardStats(card, includeBorders = true) {
  const odds = adjustedOdds(card, includeBorders);
  if (!odds) return { hp: 0, atk: 0, odds: 0 };
  const rawHP = Math.floor(Math.pow(2, Math.log10(odds)) * 20);
  const rawATK = Math.floor(rawHP / 3);
  const weatherMult = getWeatherMultiplier(card);
  return {
    hp: Math.floor(rawHP * weatherMult),
    atk: Math.floor(rawATK * weatherMult),
    odds,
    weatherMult
  };
}

function setBorderVars(element) {
  const colors = borderColorList();
  element.classList.toggle("has-modifiers", Boolean(colors));
  if (colors) element.style.setProperty("--modifier-colors", colors);
  else element.style.removeProperty("--modifier-colors");
}

function renderStats() {
  const counts = state.data.meta?.counts || {};
  document.querySelector("#totalCards").textContent = state.cards.length || counts.cards || 0;
  document.querySelector("#totalWeather").textContent = state.cards.filter((card) => card.weather).length;
  document.querySelector("#totalVariants").textContent = state.data.meta?.variants?.length ?? 0;
}

function renderWeatherFilters() {
  const weatherNames = ["all", "Base", ...new Set(state.cards.map((card) => card.weather).filter(Boolean))];
  weatherFilters.innerHTML = weatherNames.map((name) => {
    const label = name === "all" ? "All" : name;
    return `<button class="filter-pill ${state.activeWeather === name ? "is-active" : ""}" type="button" data-weather="${escapeHTML(name)}">${escapeHTML(label)}</button>`;
  }).join("");
}

function cardTileHTML(card) {
  const isSelected = card.id === state.selectedId;
  const weather = card.weather ? `<span class="card-tag">${escapeHTML(card.weather)}</span>` : "";
  const borderClass = isSelected && state.selectedBorders.size ? "has-modifiers" : "";
  const borderStyle = isSelected && state.selectedBorders.size ? `--modifier-colors:${escapeHTML(borderColorList())};` : "";
  const stats = cardStats(card, false);

  return `
    <button class="card-tile ${isSelected ? "is-selected" : ""} ${borderClass}" type="button" data-id="${escapeHTML(card.id)}" style="--rarity-color:${NEUTRAL_CARD_COLOR}; --card-accent:${escapeHTML(cardAccent(card))}; ${borderStyle}">
      <span class="card-art card-image-frame" aria-hidden="true">${cardImageHTML(card)}</span>
      <span class="tile-topline">${weather}</span>
      <h3>${escapeHTML(card.name)}</h3>
      <span class="card-stat">HP: ${escapeHTML(formatNumber(stats.hp))} • ATK: ${escapeHTML(formatNumber(stats.atk))}</span>
      <span class="card-stat">Odds: ${escapeHTML(card.oddsLabel || formatOdds(card.odds))}</span>
      <span class="card-stat">Source: ${escapeHTML(getWeatherName(card))}</span>
    </button>
  `;
}

function renderIndex() {
  const cards = getVisibleCards();
  activeSectionTitle.textContent = "Index";
  resultCount.textContent = `${cards.length} result${cards.length === 1 ? "" : "s"}`;
  weatherFilters.style.display = "flex";
  cardGrid.innerHTML = cards.length ? cards.map(cardTileHTML).join("") : `<div class="empty-state">No cards match that search/filter.</div>`;
}

function renderCalculatorSoon() {
  closePreviewModal();
  activeSectionTitle.textContent = "Chance Calc";
  resultCount.textContent = "";
  weatherFilters.style.display = "none";
  cardGrid.innerHTML = `<article class="info-panel span-all calc-soon"><h3>Chance calculator</h3><p>Not added yet.</p></article>`;
  previewCard.classList.remove("has-modifiers");
  previewArt.className = "preview-art card-image-frame";
  previewArt.innerHTML = `<span class="image-empty" aria-hidden="true"></span>`;
  previewName.textContent = "Chance Calc";
  previewMeta.textContent = "Not added yet.";
  previewBaseHP.textContent = "—";
  previewBaseATK.textContent = "—";
  previewCurrentHP.textContent = "—";
  previewCurrentATK.textContent = "—";
  previewBaseOdds.textContent = "—";
  previewCurrentOdds.textContent = "—";
  previewAbility.textContent = "—";
  previewSource.textContent = "—";
  renderBorderControls();
}

function renderCurrentSection() {
  if (state.activeSection === "calculator") {
    renderCalculatorSoon();
    return;
  }

  renderIndex();
  const visible = getVisibleCards();
  if (!visible.some((card) => card.id === state.selectedId)) selectItem(visible[0]?.id, false);
  else updatePreview();
}

function renderBorderControls() {
  const borders = state.data.meta?.variants || [];
  if (!borders.length) {
    modifierControls.innerHTML = `<span class="muted-small">No border data found.</span>`;
    return;
  }

  modifierControls.innerHTML = borders.map((border) => {
    const active = state.selectedBorders.has(border.name);
    return `
      <button class="modifier-button ${active ? "is-active" : ""}" type="button" data-modifier="${escapeHTML(border.name)}" style="--chip-color:${escapeHTML(border.color || "#d8b24e")}">
        <span>${escapeHTML(border.name)}</span>
        <small>${escapeHTML(border.chanceLabel || "")}</small>
      </button>
    `;
  }).join("");
}

function updatePreview() {
  const card = getSelectedCard();
  if (!card) return;

  previewCard.style.setProperty("--preview-color", NEUTRAL_CARD_COLOR);
  previewCard.style.setProperty("--card-accent", cardAccent(card));
  previewArt.className = "preview-art card-image-frame";
  previewArt.innerHTML = cardImageHTML(card);
  setBorderVars(previewCard);
  setBorderVars(previewArt);

  const selectedNames = selectedBorderNames();
  const displayName = selectedNames.length ? `${selectedNames.join(" ")} ${card.name}` : card.name;
  const baseStats = cardStats(card, false);
  const currentStats = cardStats(card, true);
  const weatherText = getWeatherMultiplier(card) !== 1 ? ` • ${getWeatherMultiplier(card)}x stats` : "";

  previewName.textContent = displayName;
  previewMeta.textContent = card.abilityDescription || "—";
  previewBaseHP.textContent = formatNumber(baseStats.hp);
  previewBaseATK.textContent = formatNumber(baseStats.atk);
  previewCurrentHP.textContent = formatNumber(currentStats.hp);
  previewCurrentATK.textContent = formatNumber(currentStats.atk);
  previewBaseOdds.textContent = card.oddsLabel || formatOdds(card.odds);
  previewCurrentOdds.textContent = formatOdds(currentStats.odds);
  previewAbility.textContent = titleCaseAbility(card.ability || card.abilityType);
  previewSource.textContent = (card.weather ? card.weather : card.source || "Base") + weatherText;
  renderBorderControls();
}

function selectItem(id, shouldOpenPreview = true) {
  const card = state.cards.find((item) => item.id === id) || getVisibleCards()[0] || state.cards[0];
  if (!card) return;
  state.selectedId = card.id;
  updatePreview();
  if (state.activeSection === "index") renderIndex();
  if (shouldOpenPreview) openPreviewModal();
}

function setActiveSection(section) {
  state.activeSection = section;
  state.selectedId = null;
  closePreviewModal();
  document.querySelectorAll(".rail-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === section);
  });
  renderCurrentSection();
}

function wireEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    closePreviewModal();
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
    closePreviewModal();
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

  previewArea?.addEventListener("click", (event) => {
    if (event.target === previewArea) closePreviewModal();
  });

  previewClose?.addEventListener("click", closePreviewModal);

  modifierControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-modifier]");
    if (!button) return;
    const border = button.dataset.modifier;
    if (state.selectedBorders.has(border)) state.selectedBorders.delete(border);
    else state.selectedBorders.add(border);
    updatePreview();
    if (state.activeSection === "index") renderIndex();
  });

  copyCardButton.addEventListener("click", async () => {
    const card = getSelectedCard();
    if (!card) return;
    try {
      await navigator.clipboard.writeText(previewName.textContent || card.name);
      copyCardButton.textContent = "Copied";
      setTimeout(() => copyCardButton.textContent = "Copy card name", 1200);
    } catch {
      copyCardButton.textContent = card.name;
    }
  });

  window.addEventListener("resize", () => {
    if (!isMobilePreviewMode()) closePreviewModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePreviewModal();
  });
}

async function fetchJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} failed`);
  return response.json();
}

async function loadData() {
  try {
    const data = await fetchJSON("data/cards.json");
    if (Array.isArray(data.parts)) {
      const partResults = await Promise.allSettled(data.parts.map((partPath) => fetchJSON(partPath)));
      data.cards = partResults.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        return Array.isArray(result.value.cards) ? result.value.cards : [];
      });
    }
    state.cards = (Array.isArray(data.cards) ? data.cards : []).filter(isRollableCard);
    data.cards = state.cards;
    data.meta = data.meta || {};
    data.meta.counts = data.meta.counts || {};
    data.meta.counts.cards = state.cards.length;
    data.meta.counts.weatherCards = state.cards.filter((card) => card.weather).length;
    state.data = data;
  } catch (error) {
    console.error("Card data did not load", error);
    state.data = fallbackData;
    state.cards = [];
  }
}

async function init() {
  await loadData();
  renderStats();
  renderWeatherFilters();
  wireEvents();
  renderBorderControls();
  renderCurrentSection();
}

init();

const fallbackCards = [
  {
    id: "book-of-luck",
    name: "Book of Luck",
    rarity: "Common",
    section: "cards",
    stat: "+22 Luck",
    source: "World Drop",
    borders: ["Plain", "Gold"],
    symbol: "✦",
    color: "#a6a6a6"
  },
  {
    id: "frost-oracle",
    name: "Frost Oracle",
    rarity: "Rare",
    section: "cards",
    stat: "+10% Luck",
    source: "Blizzard Event",
    borders: ["Plain", "Frost"],
    symbol: "☽",
    color: "#54abdc"
  },
  {
    id: "night-warden",
    name: "Night Warden",
    rarity: "Epic",
    section: "cards",
    stat: "+40 Luck",
    source: "Dungeon",
    borders: ["Plain", "Void", "Gold", "Abyss"],
    symbol: "◇",
    color: "#ae5fe6"
  },
  {
    id: "ashen-crown",
    name: "Ashen Crown",
    rarity: "Legendary",
    section: "cards",
    stat: "+8% Roll Speed",
    source: "Event Boss",
    borders: ["Plain", "Blood", "Gold"],
    symbol: "✚",
    color: "#e6604d"
  },
  {
    id: "moon-reliquary",
    name: "Moon Reliquary",
    rarity: "Mythic",
    section: "cards",
    stat: "+75 Luck",
    source: "Moon Event",
    borders: ["Plain", "Moon", "Gold", "Shiny", "Void", "Ancient"],
    symbol: "☽",
    color: "#deb850"
  },
  {
    id: "grave-sigil",
    name: "Grave Sigil",
    rarity: "Uncommon",
    section: "cards",
    stat: "+15 Luck",
    source: "Crafting",
    borders: ["Plain"],
    symbol: "✦",
    color: "#5cc173"
  },
  {
    id: "eclipse-tome",
    name: "Eclipse Tome",
    rarity: "Mythic",
    section: "cards",
    stat: "+12% Roll Speed",
    source: "Eclipse Set",
    borders: ["Plain", "Void", "Gold"],
    symbol: "◌",
    color: "#deb850"
  },
  {
    id: "blood-bell",
    name: "Blood Bell",
    rarity: "Legendary",
    section: "cards",
    stat: "+55 Luck",
    source: "Limited Event",
    borders: ["Plain", "Blood"],
    symbol: "✚",
    color: "#e6604d"
  },
  {
    id: "void-border",
    name: "Void Border",
    rarity: "Epic",
    section: "borders",
    stat: "Cosmetic Frame",
    source: "Dungeon Chest",
    borders: ["Void"],
    symbol: "◇",
    color: "#ae5fe6"
  },
  {
    id: "athena-set",
    name: "Athena Set",
    rarity: "Mythic",
    section: "sets",
    stat: "Luck Build",
    source: "Set Bonus",
    borders: ["Gold", "Shiny"],
    symbol: "☼",
    color: "#deb850"
  },
  {
    id: "luck-potion-1",
    name: "Luck Potion I",
    rarity: "Rare",
    section: "potions",
    stat: "+10% Luck / 240s",
    source: "Potion Shop",
    borders: ["Bottle"],
    symbol: "✚",
    color: "#54abdc"
  },
  {
    id: "starter-guide",
    name: "Starter Luck Guide",
    rarity: "Common",
    section: "guides",
    stat: "Beginner Build",
    source: "Guide Page",
    borders: ["Guide"],
    symbol: "?",
    color: "#a6a6a6"
  }
];

const state = {
  cards: [],
  activeSection: "cards",
  activeRarity: "all",
  query: "",
  selectedId: null
};

const sectionTitles = {
  cards: "All Cards",
  borders: "Borders",
  sets: "Sets",
  potions: "Potions",
  guides: "Guides"
};

const sectionLabels = {
  cards: "Cards",
  borders: "Borders",
  sets: "Sets",
  potions: "Potions",
  guides: "Guides"
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
const previewStat = document.querySelector("#previewStat");
const previewSource = document.querySelector("#previewSource");
const previewRarity = document.querySelector("#previewRarity");
const previewBorders = document.querySelector("#previewBorders");
const copyCardButton = document.querySelector("#copyCardButton");

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getSearchBlob(item) {
  return normalize([
    item.name,
    item.rarity,
    item.stat,
    item.source,
    item.section,
    ...(item.borders || [])
  ].join(" "));
}

function getFilteredItems() {
  const query = normalize(state.query);

  return state.cards.filter((item) => {
    const matchesSection = item.section === state.activeSection;
    const matchesRarity = state.activeRarity === "all" || item.rarity === state.activeRarity;
    const matchesQuery = !query || getSearchBlob(item).includes(query);
    return matchesSection && matchesRarity && matchesQuery;
  });
}

function renderStats() {
  const cards = state.cards.filter((item) => item.section === "cards");
  const borders = new Set(state.cards.flatMap((item) => item.borders || []));
  const sets = state.cards.filter((item) => item.section === "sets");

  document.querySelector("#totalCards").textContent = cards.length;
  document.querySelector("#totalBorders").textContent = borders.size;
  document.querySelector("#totalSets").textContent = sets.length;
}

function renderGrid() {
  const items = getFilteredItems();
  activeSectionTitle.textContent = sectionTitles[state.activeSection] || "Index";
  activeSectionLabel.textContent = sectionLabels[state.activeSection] || "Index";
  resultCount.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;

  if (!items.length) {
    cardGrid.innerHTML = `<div class="empty-state">No placeholder entries match that search yet.</div>`;
    return;
  }

  cardGrid.innerHTML = items.map((item) => `
    <button class="card-tile ${item.id === state.selectedId ? "is-selected" : ""}" type="button" data-id="${item.id}" style="--rarity-color: ${item.color || "#d8b24e"}">
      <span class="card-art" aria-hidden="true">${item.symbol || "✦"}</span>
      <h3>${item.name}</h3>
      <span class="card-meta">${item.rarity}</span>
      <span class="card-stat">${item.stat}</span>
      <span class="card-stat">${item.source}</span>
    </button>
  `).join("");
}

function selectItem(id) {
  const item = state.cards.find((card) => card.id === id) || getFilteredItems()[0] || state.cards[0];
  if (!item) return;

  state.selectedId = item.id;
  previewCard.style.setProperty("--preview-color", item.color || "#d8b24e");
  previewArt.innerHTML = `<span>${item.symbol || "✦"}</span>`;
  previewName.textContent = item.name;
  previewMeta.textContent = `${item.rarity} placeholder entry from ${item.source}. Replace this with the real game description later.`;
  previewStat.textContent = item.stat || "—";
  previewSource.textContent = item.source || "—";
  previewRarity.textContent = item.rarity || "—";
  previewBorders.textContent = (item.borders || []).join(", ") || "—";

  renderGrid();
}

function setActiveSection(section) {
  state.activeSection = section;
  state.activeRarity = "all";
  state.selectedId = null;

  document.querySelectorAll(".rail-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.section === section);
  });

  document.querySelectorAll(".filter-pill").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.rarity === "all");
  });

  renderGrid();
  selectItem(getFilteredItems()[0]?.id);
}

function wireEvents() {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderGrid();
    if (!getFilteredItems().some((item) => item.id === state.selectedId)) {
      selectItem(getFilteredItems()[0]?.id);
    }
  });

  document.querySelector("#sectionNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-section]");
    if (!button) return;
    setActiveSection(button.dataset.section);
  });

  document.querySelector("#rarityFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-rarity]");
    if (!button) return;
    state.activeRarity = button.dataset.rarity;
    document.querySelectorAll(".filter-pill").forEach((pill) => {
      pill.classList.toggle("is-active", pill === button);
    });
    renderGrid();
    selectItem(getFilteredItems()[0]?.id);
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

async function loadCards() {
  try {
    const response = await fetch("data/cards.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load data/cards.json");
    const data = await response.json();
    state.cards = Array.isArray(data.cards) ? data.cards : fallbackCards;
  } catch (error) {
    console.warn("Using fallback placeholder data:", error);
    state.cards = fallbackCards;
  }
}

async function init() {
  await loadCards();
  wireEvents();
  renderStats();
  renderGrid();
  selectItem(getFilteredItems()[0]?.id);
}

init();

const CardFantasy2D = (() => {
  const DATA_MANIFEST = "data/cards.json";
  const SAVE_KEY = "cardFantasy2DGameSaveV1";
  const MAX_TEAM = 5;
  const AUTO_ROLL_MS = 850;
  const BORDER_STATS = {
    "": { label: "Base", stat: 1, rollLuck: 1, color: "#8c8170" },
    Shiny: { label: "Shiny", stat: 1.25, rollLuck: 1.15, color: "#e8e8e8" },
    Diamond: { label: "Diamond", stat: 1.65, rollLuck: 1.5, color: "#68d8ff" },
    Radiant: { label: "Radiant", stat: 2.4, rollLuck: 2.1, color: "#ffd86b" }
  };

  const app = document.querySelector("#gameApp");
  let cards = [];
  let variants = [];
  let cardMap = new Map();
  let autoRollTimer = null;
  let lastRollCardKey = "";

  const relicPool = [
    { id: "lucky_coin", name: "Lucky Coin", icon: "◍", text: "+2 coins every roll and fight win.", type: "coins" },
    { id: "war_banner", name: "War Banner", icon: "⚔", text: "+18% team ATK against NPCs.", type: "atk" },
    { id: "golden_apple", name: "Golden Apple", icon: "●", text: "+18% team HP against NPCs.", type: "hp" },
    { id: "weather_totem", name: "Weather Totem", icon: "☁", text: "Weather cards get +35% ATK.", type: "weather" },
    { id: "shiny_lens", name: "Shiny Lens", icon: "✦", text: "Bordered cards get +25% ATK.", type: "border" },
    { id: "diamond_wall", name: "Diamond Wall", icon: "▰", text: "NPC damage is reduced by 18%.", type: "defense" },
    { id: "radiant_spark", name: "Radiant Spark", icon: "✹", text: "+20 flat team damage.", type: "flat" },
    { id: "relic_magnet", name: "Relic Magnet", icon: "◆", text: "Better chance to find relics after NPC wins.", type: "drop" }
  ];

  const charmPool = [
    { id: "roll_charm", name: "Roll Charm", icon: "⌁", text: "+12% rare roll luck.", type: "luck" },
    { id: "power_charm", name: "Power Charm", icon: "⚔", text: "+12% team ATK.", type: "atk" },
    { id: "heart_charm", name: "Heart Charm", icon: "♥", text: "+12% team HP.", type: "hp" },
    { id: "coin_charm", name: "Coin Charm", icon: "◍", text: "+1 coin per roll.", type: "coin" },
    { id: "craft_charm", name: "Craft Charm", icon: "✧", text: "Crafting costs 15% less.", type: "craft" },
    { id: "hunter_charm", name: "Hunter Charm", icon: "☠", text: "+10% NPC rewards.", type: "reward" }
  ];

  let save = defaultSave();

  function defaultSave() {
    return {
      rolls: 0,
      coins: 0,
      dust: 0,
      wave: 1,
      wins: 0,
      losses: 0,
      inventory: {},
      equipped: [],
      relics: {},
      charms: {},
      equippedCharm: "",
      lastRoll: null,
      log: ["2D save created. Roll cards to build your team."]
    };
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value) {
    return Math.floor(Number(value || 0)).toLocaleString();
  }

  function compactNumber(value) {
    const num = Number(value || 0);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}m`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return formatNumber(num);
  }

  function log(text) {
    save.log.unshift(text);
    save.log = save.log.slice(0, 10);
  }

  function writeSave() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    updateTopStats();
  }

  function loadSave() {
    try {
      const stored = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (stored && typeof stored === "object") save = { ...defaultSave(), ...stored };
    } catch {
      save = defaultSave();
    }
    save.inventory ||= {};
    save.equipped ||= [];
    save.relics ||= {};
    save.charms ||= {};
    save.log ||= [];
  }

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} failed`);
    return response.json();
  }

  async function loadCards() {
    const data = await fetchJSON(DATA_MANIFEST);
    variants = data.meta?.variants?.length ? data.meta.variants : [
      { name: "Shiny", chance: 100, color: "#e8e8e8" },
      { name: "Diamond", chance: 10000, color: "#68d8ff" },
      { name: "Radiant", chance: 1500000, color: "#ffd86b" }
    ];

    const parts = Array.isArray(data.parts) ? data.parts : [];
    const results = await Promise.allSettled(parts.map(fetchJSON));
    cards = results.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return Array.isArray(result.value.cards) ? result.value.cards : [];
    }).filter((card) => Number(card?.odds) > 0 && !String(card?.oddsLabel || "").toLowerCase().includes("not rollable"));

    cardMap = new Map(cards.map((card) => [card.id, card]));
  }

  function unlocked() {
    return {
      autoRoll: save.rolls >= 10,
      fight: save.rolls >= 5,
      crafting: save.rolls >= 25,
      charms: save.rolls >= 40,
      relics: save.rolls >= 60 || save.wins >= 3 || save.wave >= 4
    };
  }

  function charmLevel(type) {
    const charm = charmPool.find((item) => item.type === type && save.charms[item.id]);
    return charm ? save.charms[charm.id] || 0 : 0;
  }

  function equippedCharm() {
    return charmPool.find((item) => item.id === save.equippedCharm) || null;
  }

  function relicLevel(type) {
    return relicPool
      .filter((item) => item.type === type)
      .reduce((sum, relic) => sum + (save.relics[relic.id] || 0), 0);
  }

  function activeCharmBonus(type) {
    const charm = equippedCharm();
    if (!charm || charm.type !== type) return 0;
    return 1 + 0.12 * (save.charms[charm.id] || 1);
  }

  function rollLuck() {
    const charm = equippedCharm();
    const charmBonus = charm?.type === "luck" ? 1 + 0.12 * (save.charms[charm.id] || 1) : 1;
    const radiantRelic = 1 + relicLevel("drop") * 0.08;
    return charmBonus * radiantRelic;
  }

  function chooseWeightedCard() {
    const luck = rollLuck();
    const exponent = Math.max(0.34, 0.56 - (luck - 1) * 0.035);
    const weights = cards.map((card) => 1 / Math.pow(Number(card.odds || 1), exponent));
    const total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < cards.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return cards[i];
    }
    return cards[0];
  }

  function rollBorder() {
    const luck = rollLuck();
    const ordered = [...variants].sort((a, b) => Number(b.chance || 1) - Number(a.chance || 1));
    for (const variant of ordered) {
      const denom = Math.max(1, Math.sqrt(Number(variant.chance || 1)) / luck);
      if (Math.random() < 1 / denom) return variant.name;
    }
    return "";
  }

  function invKey(cardId, border = "") {
    return `${cardId}::${border}`;
  }

  function inventoryItem(key) {
    const item = save.inventory[key];
    if (!item) return null;
    const card = cardMap.get(item.cardId);
    if (!card) return null;
    return { ...item, key, card };
  }

  function allInventoryItems() {
    return Object.keys(save.inventory)
      .map(inventoryItem)
      .filter(Boolean)
      .sort((a, b) => itemPower(b) - itemPower(a));
  }

  function borderStatMult(border) {
    return BORDER_STATS[border]?.stat || 1;
  }

  function baseStats(card, border = "") {
    const odds = Number(card?.odds || 1) * borderStatMult(border);
    const logOdds = Math.max(1, Math.log10(odds));
    const weatherMult = Number(card?.statMult || 1) || 1;
    return {
      hp: Math.round((35 + logOdds * 23) * weatherMult),
      atk: Math.round((8 + logOdds * 7) * weatherMult),
      power: Math.round((35 + logOdds * 23) * weatherMult + (8 + logOdds * 7) * weatherMult * 4)
    };
  }

  function itemPower(item) {
    const stats = baseStats(item.card, item.border);
    return stats.power + Math.log10(Number(item.card.odds || 1)) * 20;
  }

  function teamItems() {
    return save.equipped.map(inventoryItem).filter(Boolean);
  }

  function teamStats() {
    const team = teamItems();
    const hpMult = activeCharmBonus("hp") || 1;
    const atkMult = activeCharmBonus("atk") || 1;
    const relicHp = 1 + relicLevel("hp") * 0.18;
    const relicAtk = 1 + relicLevel("atk") * 0.18;
    const weatherAtk = relicLevel("weather") * 0.35;
    const borderAtk = relicLevel("border") * 0.25;
    const flat = relicLevel("flat") * 20;

    return team.reduce((total, item) => {
      const stats = baseStats(item.card, item.border);
      const isWeather = Boolean(item.card.weather);
      const hasBorder = Boolean(item.border);
      let atk = stats.atk * atkMult * relicAtk;
      if (isWeather) atk *= 1 + weatherAtk;
      if (hasBorder) atk *= 1 + borderAtk;
      total.hp += Math.round(stats.hp * hpMult * relicHp);
      total.atk += Math.round(atk);
      return total;
    }, { hp: 0, atk: flat, size: team.length });
  }

  function addInventory(card, border = "") {
    const key = invKey(card.id, border);
    if (!save.inventory[key]) save.inventory[key] = { cardId: card.id, border, count: 0 };
    save.inventory[key].count += 1;
    lastRollCardKey = key;
    if (!save.equipped.length) save.equipped.push(key);
  }

  function rarityDust(card) {
    return Math.max(1, Math.ceil(Math.log10(Number(card.odds || 1))));
  }

  function rollOnce({ silent = false } = {}) {
    const card = chooseWeightedCard();
    const border = rollBorder();
    addInventory(card, border);
    save.rolls += 1;
    const coinGain = 1 + relicLevel("coins") * 2 + (equippedCharm()?.type === "coin" ? save.charms[save.equippedCharm] || 1 : 0);
    const dustGain = rarityDust(card) + (border ? 5 : 0);
    save.coins += coinGain;
    save.dust += dustGain;
    save.lastRoll = { cardId: card.id, border, dustGain, coinGain };
    if (!silent) log(`Rolled ${border ? `${border} ` : ""}${card.name}. +${coinGain} coins, +${dustGain} dust.`);
    checkUnlockLogs();
    autoEquipBest(false);
    writeSave();
    render();
  }

  function checkUnlockLogs() {
    const recent = save.rolls;
    if (recent === 5) log("NPC fights unlocked.");
    if (recent === 10) log("Auto Roll unlocked.");
    if (recent === 25) log("Crafting unlocked.");
    if (recent === 40) log("Charms unlocked.");
    if (recent === 60) log("Relics unlocked.");
  }

  function toggleAutoRoll() {
    if (!unlocked().autoRoll) {
      log("Auto Roll unlocks at 10 rolls.");
      render();
      return;
    }
    if (autoRollTimer) {
      clearInterval(autoRollTimer);
      autoRollTimer = null;
      log("Auto Roll stopped.");
      render();
      return;
    }
    autoRollTimer = setInterval(() => rollOnce({ silent: true }), AUTO_ROLL_MS);
    log("Auto Roll started.");
    render();
  }

  function autoEquipBest(shouldRender = true) {
    const best = allInventoryItems().slice(0, MAX_TEAM).map((item) => item.key);
    save.equipped = best;
    if (shouldRender) {
      log("Best cards equipped.");
      writeSave();
      render();
    }
  }

  function toggleEquip(key) {
    if (!save.inventory[key]) return;
    if (save.equipped.includes(key)) save.equipped = save.equipped.filter((item) => item !== key);
    else {
      if (save.equipped.length >= MAX_TEAM) save.equipped.shift();
      save.equipped.push(key);
    }
    writeSave();
    render();
  }

  function enemyStats() {
    const names = ["Training Dummy", "Goblin", "Bandit", "Orc Warrior", "Blood Knight", "Frost Warden", "Void Beast", "Radiant Titan"];
    const tier = Math.min(names.length - 1, Math.floor((save.wave - 1) / 3));
    return {
      name: names[tier],
      hp: Math.round(75 + save.wave * 45 + Math.pow(save.wave, 1.35) * 25),
      atk: Math.round(12 + save.wave * 8 + Math.pow(save.wave, 1.18) * 3)
    };
  }

  function fightNpc() {
    if (!unlocked().fight) {
      log("NPC fights unlock at 5 rolls.");
      render();
      return;
    }
    const team = teamStats();
    if (!team.size) {
      log("Equip at least one card before fighting.");
      render();
      return;
    }

    const enemy = enemyStats();
    const defense = Math.min(0.7, relicLevel("defense") * 0.18);
    const teamTurns = Math.ceil(enemy.hp / Math.max(1, team.atk));
    const enemyDamage = Math.round(enemy.atk * (1 - defense));
    const enemyTurns = Math.ceil(team.hp / Math.max(1, enemyDamage));

    if (teamTurns <= enemyTurns) {
      const rewardMult = activeCharmBonus("reward") || 1;
      const coinGain = Math.round((9 + save.wave * 3 + relicLevel("coins") * 2) * rewardMult);
      const dustGain = Math.round((8 + save.wave * 2) * rewardMult);
      save.coins += coinGain;
      save.dust += dustGain;
      save.wins += 1;
      log(`Defeated ${enemy.name} on wave ${save.wave}. +${coinGain} coins, +${dustGain} dust.`);
      save.wave += 1;
      maybeDropRelic();
    } else {
      save.losses += 1;
      save.coins += 2;
      log(`${enemy.name} won. Upgrade cards, craft, or roll more. +2 coins.`);
    }
    writeSave();
    render();
  }

  function maybeDropRelic() {
    const isUnlocked = unlocked().relics;
    if (!isUnlocked && save.wins < 3) return;
    const chance = 0.18 + relicLevel("drop") * 0.07 + (save.wins % 5 === 0 ? 0.35 : 0);
    if (Math.random() <= chance) {
      const relic = randomMissingOrAny(relicPool, save.relics);
      save.relics[relic.id] = (save.relics[relic.id] || 0) + 1;
      log(`Relic unlocked: ${relic.name}.`);
    }
  }

  function randomMissingOrAny(pool, owned) {
    const missing = pool.filter((item) => !owned[item.id]);
    const list = missing.length ? missing : pool;
    return list[Math.floor(Math.random() * list.length)];
  }

  function craftCost(baseCoins, baseDust) {
    const discount = equippedCharm()?.type === "craft" ? 0.85 : 1;
    return { coins: Math.ceil(baseCoins * discount), dust: Math.ceil(baseDust * discount) };
  }

  function canPay(cost) {
    return save.coins >= cost.coins && save.dust >= cost.dust;
  }

  function pay(cost) {
    save.coins -= cost.coins;
    save.dust -= cost.dust;
  }

  function craftCharm() {
    if (!unlocked().charms) {
      log("Charms unlock at 40 rolls.");
      render();
      return;
    }
    const cost = craftCost(25, 60);
    if (!canPay(cost)) {
      log(`Craft Charm needs ${cost.coins} coins and ${cost.dust} dust.`);
      render();
      return;
    }
    pay(cost);
    const charm = randomMissingOrAny(charmPool, save.charms);
    save.charms[charm.id] = (save.charms[charm.id] || 0) + 1;
    if (!save.equippedCharm) save.equippedCharm = charm.id;
    log(`Crafted ${charm.name}.`);
    writeSave();
    render();
  }

  function craftRelic() {
    if (!unlocked().relics) {
      log("Relic crafting unlocks at 60 rolls, 3 wins, or wave 4.");
      render();
      return;
    }
    const cost = craftCost(55, 120);
    if (!canPay(cost)) {
      log(`Craft Relic needs ${cost.coins} coins and ${cost.dust} dust.`);
      render();
      return;
    }
    pay(cost);
    const relic = randomMissingOrAny(relicPool, save.relics);
    save.relics[relic.id] = (save.relics[relic.id] || 0) + 1;
    log(`Crafted relic: ${relic.name}.`);
    writeSave();
    render();
  }

  function forgeBorder() {
    if (!unlocked().crafting) {
      log("Border forging unlocks at 25 rolls.");
      render();
      return;
    }
    const cost = craftCost(40, 80);
    if (!canPay(cost)) {
      log(`Forge Border needs ${cost.coins} coins and ${cost.dust} dust.`);
      render();
      return;
    }
    const baseEquipped = save.equipped.map(inventoryItem).find((item) => item && !item.border);
    if (!baseEquipped) {
      log("Equip a base card with no border first.");
      render();
      return;
    }
    pay(cost);
    const border = rollBorder() || "Shiny";
    const oldKey = baseEquipped.key;
    const newKey = invKey(baseEquipped.cardId, border);
    save.inventory[oldKey].count -= 1;
    if (save.inventory[oldKey].count <= 0) delete save.inventory[oldKey];
    if (!save.inventory[newKey]) save.inventory[newKey] = { cardId: baseEquipped.cardId, border, count: 0 };
    save.inventory[newKey].count += 1;
    save.equipped = save.equipped.map((key) => key === oldKey ? newKey : key).filter((key) => save.inventory[key]);
    log(`Forged ${border} ${baseEquipped.card.name}.`);
    writeSave();
    render();
  }

  function equipCharm(id) {
    if (!save.charms[id]) return;
    save.equippedCharm = save.equippedCharm === id ? "" : id;
    writeSave();
    render();
  }

  function resetGame() {
    if (!confirm("Reset only the 2D game save? The card index will not be affected.")) return;
    clearInterval(autoRollTimer);
    autoRollTimer = null;
    save = defaultSave();
    writeSave();
    render();
  }

  function updateTopStats() {
    document.querySelector("#statRolls").textContent = compactNumber(save.rolls);
    document.querySelector("#statWave").textContent = compactNumber(save.wave);
    document.querySelector("#statCards").textContent = compactNumber(Object.values(save.inventory).reduce((sum, item) => sum + item.count, 0));
  }

  function cardLabel(item) {
    return `${item.border ? `${item.border} ` : ""}${item.card.name}`;
  }

  function lastRollHTML() {
    if (!save.lastRoll) return `<div class="roll-result empty">Roll to get your first card.</div>`;
    const card = cardMap.get(save.lastRoll.cardId);
    if (!card) return `<div class="roll-result empty">Roll loaded.</div>`;
    const border = save.lastRoll.border || "";
    const stats = baseStats(card, border);
    return `
      <div class="roll-result ${border ? "is-special" : ""}">
        <span class="roll-card-art">${escapeHTML(card.name.slice(0, 2).toUpperCase())}</span>
        <div>
          <p>Last Roll</p>
          <h2>${escapeHTML(border ? `${border} ${card.name}` : card.name)}</h2>
          <span>${escapeHTML(card.oddsLabel || `1/${formatNumber(card.odds)}`)} • HP ${formatNumber(stats.hp)} • ATK ${formatNumber(stats.atk)}</span>
        </div>
      </div>
    `;
  }

  function progressHTML() {
    const u = unlocked();
    const rows = [
      ["NPC Fights", u.fight, "5 rolls"],
      ["Auto Roll", u.autoRoll, "10 rolls"],
      ["Crafting", u.crafting, "25 rolls"],
      ["Charms", u.charms, "40 rolls"],
      ["Relics", u.relics, "60 rolls / 3 wins / wave 4"]
    ];
    return `
      <div class="unlock-list">
        ${rows.map(([name, active, req]) => `<span class="${active ? "unlocked" : "locked"}">${active ? "✓" : "○"} ${name}<small>${escapeHTML(req)}</small></span>`).join("")}
      </div>
    `;
  }

  function rollPanelHTML() {
    const u = unlocked();
    return `
      <section class="game-panel roll-panel">
        <div class="panel-head">
          <div><p class="eyebrow">Roll Cards</p><h2>RNG</h2></div>
          <div class="wallet"><span>Coins ${formatNumber(save.coins)}</span><span>Dust ${formatNumber(save.dust)}</span></div>
        </div>
        ${lastRollHTML()}
        <div class="game-actions">
          <button class="game-action primary" type="button" data-action="roll">Roll</button>
          <button class="game-action" type="button" data-action="auto" ${!u.autoRoll ? "disabled" : ""}>${autoRollTimer ? "Stop Auto" : "Auto Roll"}</button>
          <button class="game-action ghost" type="button" data-action="reset">Reset 2D Save</button>
        </div>
        ${progressHTML()}
      </section>
    `;
  }

  function teamHTML() {
    const team = teamItems();
    const stats = teamStats();
    return `
      <section class="game-panel team-panel">
        <div class="panel-head">
          <div><p class="eyebrow">Team</p><h2>Equipped Cards</h2></div>
          <button class="game-action" type="button" data-action="auto-equip">Auto equip best</button>
        </div>
        <div class="team-stats"><span>HP ${formatNumber(stats.hp)}</span><span>ATK ${formatNumber(stats.atk)}</span><span>${team.length}/${MAX_TEAM} equipped</span></div>
        <div class="unit-grid">
          ${team.length ? team.map((item) => unitCardHTML(item, true)).join("") : `<p class="muted">Roll a card to equip it.</p>`}
        </div>
      </section>
    `;
  }

  function unitCardHTML(item, equipped = false) {
    const stats = baseStats(item.card, item.border);
    const border = item.border || "Base";
    return `
      <article class="unit-card ${equipped ? "equipped" : ""} ${lastRollCardKey === item.key ? "newest" : ""}">
        <div class="unit-art">${escapeHTML(item.card.name.slice(0, 2).toUpperCase())}</div>
        <div class="unit-main">
          <h3>${escapeHTML(cardLabel(item))}</h3>
          <p>${escapeHTML(border)} • ${escapeHTML(item.card.weather || "Base")} • x${formatNumber(item.count)}</p>
          <small>HP ${formatNumber(stats.hp)} • ATK ${formatNumber(stats.atk)} • ${escapeHTML(item.card.oddsLabel || `1/${formatNumber(item.card.odds)}`)}</small>
        </div>
        <button class="mini-button" type="button" data-equip="${escapeHTML(item.key)}">${save.equipped.includes(item.key) ? "Unequip" : "Equip"}</button>
      </article>
    `;
  }

  function inventoryHTML() {
    const items = allInventoryItems().slice(0, 24);
    return `
      <section class="game-panel inventory-panel">
        <div class="panel-head"><div><p class="eyebrow">Collection</p><h2>Inventory</h2></div><span class="muted">Showing best 24</span></div>
        <div class="inventory-grid">
          ${items.length ? items.map((item) => unitCardHTML(item)).join("") : `<p class="muted">No cards yet.</p>`}
        </div>
      </section>
    `;
  }

  function battleHTML() {
    const u = unlocked();
    const enemy = enemyStats();
    const stats = teamStats();
    return `
      <section class="game-panel battle-panel">
        <div class="panel-head">
          <div><p class="eyebrow">NPC Fight</p><h2>Wave ${formatNumber(save.wave)}</h2></div>
          <button class="game-action primary" type="button" data-action="fight" ${!u.fight ? "disabled" : ""}>Fight NPC</button>
        </div>
        <div class="battle-grid">
          <div class="battle-side"><strong>Your Team</strong><span>HP ${formatNumber(stats.hp)}</span><span>ATK ${formatNumber(stats.atk)}</span></div>
          <div class="versus">VS</div>
          <div class="battle-side enemy"><strong>${escapeHTML(enemy.name)}</strong><span>HP ${formatNumber(enemy.hp)}</span><span>ATK ${formatNumber(enemy.atk)}</span></div>
        </div>
        <p class="muted">Fights are separate from the index. Win NPC fights to get coins, dust, wave progress, and relic drops.</p>
      </section>
    `;
  }

  function craftingHTML() {
    const u = unlocked();
    const charmCost = craftCost(25, 60);
    const relicCost = craftCost(55, 120);
    const forgeCost = craftCost(40, 80);
    return `
      <section class="game-panel craft-panel">
        <div class="panel-head"><div><p class="eyebrow">Crafting</p><h2>Craft / Forge</h2></div></div>
        <div class="craft-grid">
          <button class="craft-card" type="button" data-action="forge" ${!u.crafting ? "disabled" : ""}><strong>Forge Border</strong><span>${forgeCost.coins} coins • ${forgeCost.dust} dust</span><small>Adds Shiny/Diamond/Radiant to an equipped base card.</small></button>
          <button class="craft-card" type="button" data-action="craft-charm" ${!u.charms ? "disabled" : ""}><strong>Craft Charm</strong><span>${charmCost.coins} coins • ${charmCost.dust} dust</span><small>Charms are equipable passive boosts.</small></button>
          <button class="craft-card" type="button" data-action="craft-relic" ${!u.relics ? "disabled" : ""}><strong>Craft Relic</strong><span>${relicCost.coins} coins • ${relicCost.dust} dust</span><small>Relics stack permanently in this 2D save.</small></button>
        </div>
      </section>
    `;
  }

  function charmsHTML() {
    const owned = charmPool.filter((charm) => save.charms[charm.id]);
    return `
      <section class="game-panel charm-panel">
        <div class="panel-head"><div><p class="eyebrow">Charms</p><h2>Equippable</h2></div><span class="muted">1 active</span></div>
        <div class="badge-grid">
          ${owned.length ? owned.map((charm) => `
            <button class="badge-card ${save.equippedCharm === charm.id ? "active" : ""}" type="button" data-charm="${escapeHTML(charm.id)}">
              <strong>${escapeHTML(charm.icon)} ${escapeHTML(charm.name)} +${save.charms[charm.id]}</strong>
              <span>${escapeHTML(charm.text)}</span>
            </button>
          `).join("") : `<p class="muted">Craft charms after 40 rolls.</p>`}
        </div>
      </section>
    `;
  }

  function relicsHTML() {
    const owned = relicPool.filter((relic) => save.relics[relic.id]);
    return `
      <section class="game-panel relic-panel">
        <div class="panel-head"><div><p class="eyebrow">Relics</p><h2>Permanent Drops</h2></div></div>
        <div class="badge-grid">
          ${owned.length ? owned.map((relic) => `
            <article class="badge-card active">
              <strong>${escapeHTML(relic.icon)} ${escapeHTML(relic.name)} +${save.relics[relic.id]}</strong>
              <span>${escapeHTML(relic.text)}</span>
            </article>
          `).join("") : `<p class="muted">Relics unlock from NPC wins, waves, or crafting.</p>`}
        </div>
      </section>
    `;
  }

  function logHTML() {
    return `
      <section class="game-panel log-panel">
        <div class="panel-head"><div><p class="eyebrow">Log</p><h2>Recent</h2></div></div>
        ${save.log.map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
      </section>
    `;
  }

  function render() {
    updateTopStats();
    if (!app) return;
    app.innerHTML = `
      <div class="game-layout">
        <div class="game-left">
          ${rollPanelHTML()}
          ${teamHTML()}
          ${inventoryHTML()}
        </div>
        <div class="game-right">
          ${battleHTML()}
          ${craftingHTML()}
          ${charmsHTML()}
          ${relicsHTML()}
          ${logHTML()}
        </div>
      </div>
    `;
  }

  function bind() {
    app?.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "roll") rollOnce();
      if (action === "auto") toggleAutoRoll();
      if (action === "reset") resetGame();
      if (action === "auto-equip") autoEquipBest();
      if (action === "fight") fightNpc();
      if (action === "forge") forgeBorder();
      if (action === "craft-charm") craftCharm();
      if (action === "craft-relic") craftRelic();

      const equip = event.target.closest("[data-equip]");
      if (equip) toggleEquip(equip.dataset.equip);

      const charm = event.target.closest("[data-charm]");
      if (charm) equipCharm(charm.dataset.charm);
    });
  }

  async function init() {
    loadSave();
    bind();
    try {
      await loadCards();
      updateTopStats();
      render();
    } catch (error) {
      console.error(error);
      app.innerHTML = `<section class="game-panel"><h2>Could not load cards</h2><p>The game page reads from data/cards.json. Hard refresh after GitHub Pages finishes rebuilding.</p></section>`;
    }
  }

  init();
})();

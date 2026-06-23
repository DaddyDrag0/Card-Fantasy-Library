const CardFantasyGame = (() => {
  const DATA_MANIFEST = "data/cards.json";
  const MAX_TEAM_SIZE = 5;
  const BORDER_BONUS = { Shiny: 1.25, Diamond: 1.6, Radiant: 2.25 };
  const state = {
    cards: [],
    variants: [],
    loaded: false,
    run: null,
    recruitChoices: [],
    relicChoices: []
  };

  const relicPool = [
    { name: "Lucky Coin", icon: "◍", text: "+2 gold after every win.", apply: (run) => run.goldBonus += 2 },
    { name: "War Banner", icon: "⚔", text: "+20% team ATK.", apply: (run) => run.atkMult += 0.2 },
    { name: "Golden Apple", icon: "●", text: "+20% team max HP and heal.", apply: (run) => { run.hpMult += 0.2; run.team.forEach(unit => { unit.maxHp = Math.ceil(unit.maxHp * 1.2); unit.hp = unit.maxHp; }); } },
    { name: "Vampire Fang", icon: "◆", text: "Heal 18% HP after each win.", apply: (run) => run.lifesteal += 0.18 },
    { name: "Weather Totem", icon: "☁", text: "Weather cards deal +35% ATK.", apply: (run) => run.weatherAtk += 0.35 },
    { name: "Shiny Lens", icon: "✦", text: "Bordered cards deal +30% ATK.", apply: (run) => run.borderAtk += 0.3 },
    { name: "Diamond Wall", icon: "▰", text: "Enemies deal 20% less damage.", apply: (run) => run.damageReduction += 0.2 },
    { name: "Radiant Spark", icon: "✹", text: "+14 flat damage every attack.", apply: (run) => run.flatDamage += 14 }
  ];

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pick(list, count = 1) {
    const copy = [...list];
    const picks = [];
    while (copy.length && picks.length < count) {
      picks.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return picks;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  async function fetchJSON(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} failed`);
    return response.json();
  }

  async function loadData() {
    if (state.loaded) return;
    const data = await fetchJSON(DATA_MANIFEST);
    const parts = Array.isArray(data.parts) ? data.parts : [];
    const results = await Promise.allSettled(parts.map(fetchJSON));
    state.cards = results.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return Array.isArray(result.value.cards) ? result.value.cards : [];
    }).filter((card) => Number(card?.odds) > 0);
    state.variants = data.meta?.variants || [];
    state.loaded = true;
  }

  function cardPower(card, borderName = "") {
    const odds = Number(card?.odds || 1);
    const log = Math.max(1, Math.log10(odds));
    const weatherMult = Number(card?.statMult || 1) || 1;
    const borderBonus = BORDER_BONUS[borderName] || 1;
    const maxHp = clamp(Math.round((18 + log * 16) * weatherMult * borderBonus), 20, 999);
    const atk = clamp(Math.round((5 + log * 5.5) * weatherMult * borderBonus), 4, 450);
    return { maxHp, atk };
  }

  function createUnit(card) {
    const stats = cardPower(card);
    return {
      id: `${card.id}-${crypto?.randomUUID?.() || Math.random()}`,
      cardId: card.id,
      name: card.name,
      weather: card.weather || "Base",
      ability: card.ability || card.abilityType || "None",
      odds: Number(card.odds || 1),
      oddsLabel: card.oddsLabel || `1/${Math.floor(Number(card.odds || 1)).toLocaleString()}`,
      border: "",
      maxHp: stats.maxHp,
      hp: stats.maxHp,
      atk: stats.atk
    };
  }

  function recalcUnit(unit) {
    const card = state.cards.find((item) => item.id === unit.cardId);
    if (!card) return;
    const oldMax = unit.maxHp;
    const stats = cardPower(card, unit.border);
    unit.maxHp = Math.ceil(stats.maxHp * state.run.hpMult);
    unit.hp = Math.min(unit.maxHp, Math.ceil(unit.hp * (unit.maxHp / Math.max(1, oldMax))));
    unit.atk = stats.atk;
  }

  function createEnemy(wave) {
    const names = ["Training Dummy", "Goblin Thief", "Forest Slime", "Bandit Scout", "Blood Knight", "Frost Warden", "Void Beast", "Radiant Titan"];
    const name = names[Math.min(names.length - 1, Math.floor((wave - 1) / 2))];
    const maxHp = Math.round(55 + wave * 34 + Math.pow(wave, 1.35) * 22);
    const atk = Math.round(8 + wave * 4.5);
    return { name, maxHp, hp: maxHp, atk };
  }

  function strongestStarterCards() {
    return [...state.cards].sort((a, b) => Number(a.odds || 0) - Number(b.odds || 0)).slice(0, 20);
  }

  function newRun() {
    const starters = pick(strongestStarterCards(), 3).map(createUnit);
    state.run = {
      wave: 1,
      gold: 0,
      goldBonus: 0,
      atkMult: 1,
      hpMult: 1,
      lifesteal: 0,
      weatherAtk: 0,
      borderAtk: 0,
      damageReduction: 0,
      flatDamage: 0,
      team: starters,
      relics: [],
      enemy: createEnemy(1),
      log: ["Run started. Beat waves, recruit cards, forge borders, and stack relics."]
    };
    state.recruitChoices = [];
    state.relicChoices = [];
    render();
  }

  function aliveTeam() {
    return state.run.team.filter((unit) => unit.hp > 0);
  }

  function unitAttack(unit) {
    let damage = unit.atk * state.run.atkMult;
    if (unit.weather !== "Base") damage *= 1 + state.run.weatherAtk;
    if (unit.border) damage *= 1 + state.run.borderAtk;
    return Math.max(1, Math.round(damage));
  }

  function totalAttack() {
    return aliveTeam().reduce((sum, unit) => sum + unitAttack(unit), 0) + state.run.flatDamage;
  }

  function pushLog(text) {
    state.run.log.unshift(text);
    state.run.log = state.run.log.slice(0, 7);
  }

  function winWave() {
    const goldGain = 3 + state.run.wave + state.run.goldBonus;
    state.run.gold += goldGain;
    pushLog(`Wave ${state.run.wave} cleared. +${goldGain} gold.`);
    if (state.run.lifesteal) {
      state.run.team.forEach((unit) => {
        if (unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp + Math.ceil(unit.maxHp * state.run.lifesteal));
      });
    }
    state.relicChoices = pick(relicPool, 3);
    state.run.wave += 1;
    state.run.enemy = createEnemy(state.run.wave);
  }

  function attack() {
    if (!state.run || !aliveTeam().length) return;
    if (state.relicChoices.length) {
      pushLog("Choose a relic before the next fight.");
      render();
      return;
    }

    const damage = totalAttack();
    state.run.enemy.hp = Math.max(0, state.run.enemy.hp - damage);
    pushLog(`Your team dealt ${damage} damage.`);

    if (state.run.enemy.hp <= 0) {
      winWave();
      render();
      return;
    }

    const target = pick(aliveTeam(), 1)[0];
    const enemyDamage = Math.max(1, Math.round(state.run.enemy.atk * (1 - Math.min(0.75, state.run.damageReduction))));
    target.hp = Math.max(0, target.hp - enemyDamage);
    pushLog(`${state.run.enemy.name} hit ${target.name} for ${enemyDamage}.`);

    if (!aliveTeam().length) pushLog("Run over. Start a new run to try again.");
    render();
  }

  function chooseRelic(index) {
    const relic = state.relicChoices[index];
    if (!relic || !state.run) return;
    state.run.relics.push(relic);
    relic.apply(state.run);
    state.run.team.forEach(recalcUnit);
    state.relicChoices = [];
    pushLog(`Relic gained: ${relic.name}.`);
    render();
  }

  function showRecruitChoices() {
    if (!state.run) return;
    if (state.run.gold < 4) {
      pushLog("Recruit costs 4 gold.");
      render();
      return;
    }
    const pool = [...state.cards].sort(() => Math.random() - 0.5).slice(0, 40);
    state.recruitChoices = pick(pool, 3);
    pushLog("Choose one recruit.");
    render();
  }

  function recruit(index) {
    const card = state.recruitChoices[index];
    if (!card || !state.run || state.run.gold < 4) return;
    state.run.gold -= 4;
    const unit = createUnit(card);
    state.run.team.push(unit);
    if (state.run.team.length > MAX_TEAM_SIZE) {
      state.run.team.sort((a, b) => a.hp - b.hp);
      const removed = state.run.team.shift();
      pushLog(`${unit.name} joined. ${removed.name} left the team.`);
    } else {
      pushLog(`${unit.name} joined the team.`);
    }
    state.recruitChoices = [];
    render();
  }

  function forgeBorder() {
    if (!state.run) return;
    if (state.run.gold < 5) {
      pushLog("Forge Border costs 5 gold.");
      render();
      return;
    }
    const candidates = aliveTeam().filter((unit) => !unit.border);
    const borders = state.variants.length ? state.variants.map((item) => item.name) : ["Shiny", "Diamond", "Radiant"];
    if (!candidates.length) {
      pushLog("Every living card already has a border.");
      render();
      return;
    }
    state.run.gold -= 5;
    const unit = pick(candidates, 1)[0];
    unit.border = pick(borders, 1)[0];
    recalcUnit(unit);
    unit.hp = unit.maxHp;
    pushLog(`${unit.name} became ${unit.border}.`);
    render();
  }

  function healTeam() {
    if (!state.run) return;
    if (state.run.gold < 3) {
      pushLog("Heal costs 3 gold.");
      render();
      return;
    }
    state.run.gold -= 3;
    state.run.team.forEach((unit) => {
      if (unit.hp > 0) unit.hp = Math.min(unit.maxHp, unit.hp + Math.ceil(unit.maxHp * 0.35));
    });
    pushLog("Team healed for 35% max HP.");
    render();
  }

  function unitHTML(unit) {
    const hpPct = Math.max(0, Math.round((unit.hp / unit.maxHp) * 100));
    const dead = unit.hp <= 0;
    return `
      <article class="game-unit ${dead ? "is-dead" : ""} ${unit.border ? "has-border" : ""}">
        <div class="game-sprite">${escapeHTML(unit.name.slice(0, 2).toUpperCase())}</div>
        <div class="game-unit-main">
          <h3>${escapeHTML(unit.border ? `${unit.border} ${unit.name}` : unit.name)}</h3>
          <p>${escapeHTML(unit.weather)} • ${escapeHTML(unit.oddsLabel)}</p>
          <div class="game-bar"><span style="width:${hpPct}%"></span></div>
          <small>HP ${escapeHTML(unit.hp)}/${escapeHTML(unit.maxHp)} • ATK ${escapeHTML(unitAttack(unit))}</small>
        </div>
      </article>
    `;
  }

  function enemyHTML(enemy) {
    const hpPct = Math.max(0, Math.round((enemy.hp / enemy.maxHp) * 100));
    return `
      <article class="game-enemy">
        <div class="enemy-sprite">☠</div>
        <h3>${escapeHTML(enemy.name)}</h3>
        <div class="game-bar danger"><span style="width:${hpPct}%"></span></div>
        <p>HP ${escapeHTML(enemy.hp)}/${escapeHTML(enemy.maxHp)} • ATK ${escapeHTML(enemy.atk)}</p>
      </article>
    `;
  }

  function relicChoicesHTML() {
    if (!state.relicChoices.length) return "";
    return `
      <section class="game-choice-panel">
        <h3>Choose a relic</h3>
        <div class="game-choice-grid">
          ${state.relicChoices.map((relic, index) => `
            <button class="game-choice" type="button" data-relic-choice="${index}">
              <strong>${escapeHTML(relic.icon)} ${escapeHTML(relic.name)}</strong>
              <span>${escapeHTML(relic.text)}</span>
            </button>
          `).join("")}
        </div>
      </section>
    `;
  }

  function recruitChoicesHTML() {
    if (!state.recruitChoices.length) return "";
    return `
      <section class="game-choice-panel">
        <h3>Recruit a card</h3>
        <div class="game-choice-grid">
          ${state.recruitChoices.map((card, index) => {
            const stats = cardPower(card);
            return `
              <button class="game-choice" type="button" data-recruit-choice="${index}">
                <strong>${escapeHTML(card.name)}</strong>
                <span>${escapeHTML(card.weather || "Base")} • HP ${stats.maxHp} • ATK ${stats.atk}</span>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function runHTML() {
    const run = state.run;
    if (!run) return `<button class="game-action primary" type="button" data-game-action="new">Start Run</button>`;
    const teamHp = aliveTeam().reduce((sum, unit) => sum + unit.hp, 0);
    return `
      <div class="game-topline">
        <div><strong>Wave ${escapeHTML(run.wave)}</strong><span>Team HP ${escapeHTML(teamHp)} • Gold ${escapeHTML(run.gold)} • Damage ${escapeHTML(totalAttack())}</span></div>
        <div class="game-actions">
          <button class="game-action primary" type="button" data-game-action="attack" ${!aliveTeam().length ? "disabled" : ""}>Attack</button>
          <button class="game-action" type="button" data-game-action="recruit">Recruit 4g</button>
          <button class="game-action" type="button" data-game-action="forge">Forge Border 5g</button>
          <button class="game-action" type="button" data-game-action="heal">Heal 3g</button>
          <button class="game-action ghost" type="button" data-game-action="new">New Run</button>
        </div>
      </div>

      <div class="game-arena">
        <section class="game-team">
          <h3>Your Cards</h3>
          <div class="game-team-grid">${run.team.map(unitHTML).join("")}</div>
        </section>
        <section class="game-battlefield">
          ${enemyHTML(run.enemy)}
        </section>
      </div>

      ${relicChoicesHTML()}
      ${recruitChoicesHTML()}

      <section class="game-relics">
        <h3>Relics</h3>
        <div>${run.relics.length ? run.relics.map((relic) => `<span>${escapeHTML(relic.icon)} ${escapeHTML(relic.name)}</span>`).join("") : `<em>No relics yet.</em>`}</div>
      </section>

      <section class="game-log">
        <h3>Battle Log</h3>
        ${run.log.map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
      </section>
    `;
  }

  function render() {
    const root = document.querySelector("#gameRoot");
    if (!root) return;
    root.innerHTML = `
      <section class="game-panel">
        <div class="game-hero">
          <div>
            <p class="eyebrow">Playable Prototype</p>
            <h2>CardFantasy 2D</h2>
            <p>Turn-based mini version using the card odds, HP/ATK scaling, borders, weather cards, and relic upgrades.</p>
          </div>
          <div class="game-mini-stats">
            <span>${escapeHTML(state.cards.length)} cards loaded</span>
            <span>${escapeHTML(state.variants.length || 3)} borders</span>
            <span>${escapeHTML(relicPool.length)} relics</span>
          </div>
        </div>
        ${runHTML()}
      </section>
    `;
  }

  async function mount() {
    const cardGrid = document.querySelector("#cardGrid");
    const title = document.querySelector("#activeSectionTitle");
    const count = document.querySelector("#resultCount");
    const toolbar = document.querySelector("#cardToolbar");
    const preview = document.querySelector("#previewArea");
    const compare = document.querySelector("#compareTray");

    document.body.classList.add("section-game", "section-calculator");
    toolbar?.classList.add("is-hidden");
    if (preview) preview.hidden = true;
    if (compare) compare.hidden = true;
    if (title) title.textContent = "2D Game";
    if (count) count.textContent = "prototype";
    if (cardGrid) {
      cardGrid.className = "card-grid view-grid game-host";
      cardGrid.innerHTML = `<div id="gameRoot" class="span-all"><section class="game-panel"><p>Loading game...</p></section></div>`;
    }

    try {
      await loadData();
      if (!state.run) newRun();
      else render();
    } catch (error) {
      const root = document.querySelector("#gameRoot");
      if (root) root.innerHTML = `<section class="game-panel"><h2>Game failed to load</h2><p>Card data did not load yet. Hard refresh and try again.</p></section>`;
      console.error(error);
    }
  }

  function unmountShell() {
    document.body.classList.remove("section-game");
    const cardGrid = document.querySelector("#cardGrid");
    if (cardGrid) cardGrid.className = "card-grid view-grid";
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const gameTab = event.target.closest('[data-section="game"]');
      if (gameTab) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.querySelectorAll(".rail-link").forEach((button) => button.classList.toggle("is-active", button === gameTab));
        mount();
        return;
      }

      const otherTab = event.target.closest(".rail-link[data-section]");
      if (otherTab && otherTab.dataset.section !== "game") unmountShell();
    }, true);

    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-game-action]")?.dataset.gameAction;
      if (action === "new") newRun();
      if (action === "attack") attack();
      if (action === "recruit") showRecruitChoices();
      if (action === "forge") forgeBorder();
      if (action === "heal") healTeam();

      const relicChoice = event.target.closest("[data-relic-choice]");
      if (relicChoice) chooseRelic(Number(relicChoice.dataset.relicChoice));

      const recruitChoice = event.target.closest("[data-recruit-choice]");
      if (recruitChoice) recruit(Number(recruitChoice.dataset.recruitChoice));
    });
  }

  bind();
  return { mount, newRun };
})();

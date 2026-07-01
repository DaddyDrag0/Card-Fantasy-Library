(() => {
  function getCardById(id) {
    return state.cards.find((card) => card.id === id) || null;
  }

  function getTileById(id) {
    if (!id) return null;
    return Array.from(document.querySelectorAll("#cardGrid [data-id]")).find((tile) => tile.dataset.id === id) || null;
  }

  function syncCardTileState(id) {
    const tile = getTileById(id);
    const card = getCardById(id);
    if (!tile || !card) return;

    const isSelected = card.id === state.selectedId;
    const isCompared = state.compareIds.has(card.id);
    const hasSelectedBorders = isSelected && state.selectedBorders.size > 0;
    const stats = cardStats(card, isSelected);
    const statLines = tile.querySelectorAll(".card-stat");

    tile.classList.toggle("is-selected", isSelected);
    tile.classList.toggle("is-compared", isCompared);
    tile.classList.toggle("is-compare-mode", state.compareMode);
    tile.classList.toggle("has-modifiers", hasSelectedBorders);
    tile.style.setProperty("--rarity-color", NEUTRAL_CARD_COLOR);
    tile.style.setProperty("--card-accent", cardAccent(card));

    if (hasSelectedBorders) {
      tile.style.setProperty("--modifier-colors", borderColorList());
    } else {
      tile.style.removeProperty("--modifier-colors");
    }

    if (statLines[0]) statLines[0].textContent = `HP: ${formatNumber(stats.hp)} • ATK: ${formatNumber(stats.atk)}`;
    if (statLines[1]) statLines[1].textContent = `Odds: ${card.oddsLabel || formatOdds(card.odds)}`;
    if (statLines[2]) statLines[2].textContent = `Source: ${getWeatherName(card)}`;
  }

  function optimizedSelectItem(id, shouldOpenPreview = true) {
    const previousId = state.selectedId;
    const card = getCardById(id) || getVisibleCards()[0] || state.cards[0];
    if (!card) return;

    if (previousId === card.id) {
      updatePreview();
      if (shouldOpenPreview) openPreviewModal();
      return;
    }

    state.selectedId = card.id;
    updatePreview();
    syncCardTileState(previousId);
    syncCardTileState(card.id);

    if (shouldOpenPreview) openPreviewModal();
  }

  selectItem = optimizedSelectItem;

  cardGrid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button || !cardGrid.contains(button)) return;
    if (state.compareMode) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    optimizedSelectItem(button.dataset.id);
  }, true);

  window.__cardSelectionPerformanceFix = true;
})();

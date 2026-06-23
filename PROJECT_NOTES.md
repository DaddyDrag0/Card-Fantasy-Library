# CardFantasy Library Notes

I added the first placeholder version of the CardFantasy mini wiki using the selected **left rail + card grid + preview panel** layout.

The current entries are fake placeholder data. Replace them later with real CardFantasy RNG data.

## Files added

- `index.html` — main page structure
- `styles.css` — dark fantasy layout and responsive styling
- `script.js` — search, filtering, section navigation, and preview logic
- `data/cards.json` — placeholder card, border, set, potion, and guide data

## Data format

Add real entries in `data/cards.json` using this shape:

```json
{
  "id": "unique-card-id",
  "name": "Card Name",
  "rarity": "Common",
  "section": "cards",
  "stat": "+22 Luck",
  "source": "World Drop",
  "borders": ["Plain", "Gold"],
  "symbol": "✦",
  "color": "#a6a6a6"
}
```

Supported `section` values right now:

- `cards`
- `borders`
- `sets`
- `potions`
- `guides`

## Real data needed later

1. Card names
2. Rarities
3. Main stats / bonuses
4. Obtain source / drop source
5. Border variants
6. Card images or icon names, if available
7. Sets or categories
8. Any extra wiki details like descriptions, update history, or notes

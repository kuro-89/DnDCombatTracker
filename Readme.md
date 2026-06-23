# D&D Combat Tracker

v.0.3 by kuro




A browser-based D&D 5e combat tracker by kuro.

## Current Version

v0.3.2

## Current Status

This project is currently a local browser-only web app built with:

- HTML
- CSS
- JavaScript

There is currently no backend, no database, and no persistent save system.

The app runs locally in the browser by opening `index.html`.

## Implemented Features

- Create creature cards.
- Create multiple copies of the same creature at once.
- Separate internal creature name and public display name.
- Creature types:
  - Player
  - NPC
  - Monster
- Initiative-based turn order.
- Automatic sorting by initiative.
- Round and turn counter.
- Previous turn and next turn controls.
- Card zones:
  - Cards on hand
  - Card deck
- Only cards on hand participate in the current combat.
- Move cards between hand and deck.
- Move all cards or cards of a specific type between hand and deck.
- Remove individual cards.
- Track:
  - Current HP
  - Max HP
  - Temporary HP
  - Armor Class
  - Passive Perception
  - Passive Insight
- Apply:
  - Damage
  - Healing
  - Temporary HP
- Add and remove D&D conditions.
- Clear all temporary HP.
- Clear conditions from all cards currently on hand.
- Local image selection for creature cards.
- Public player preview with filtered information.

## Public Player Preview

The current player preview shows public combat information based on the cards currently on hand.

It includes:

- Current round
- Current turn
- The creature currently taking its turn
- Previous card
- Main displayed card
- Next card
- Public initiative ribbon
- Public HP display based on the selected visibility mode
- Publicly visible conditions

Players can click a card in the public initiative ribbon to display it as the main card.

### Color Logic

The public preview uses a simple color language:

- Blue means the active turn card.
- Yellow means a manually selected card.

The “Show Active Card” button is also blue because it returns the preview to the active turn card.

## HP Visibility Modes

Each creature can have a public HP visibility mode:

- `full`  
  Players see current HP, max HP, and an HP bar.

- `bar`  
  Players see only an HP bar.

- `descriptive`  
  Players see a descriptive state such as “lightly injured” or “almost defeated”.

- `hidden`  
  Players do not see HP information.

The DM always sees the full HP information.

## Image Handling

Images are currently selected locally in the browser.

At the moment:

- Images are not uploaded to a server.
- Images are not saved to GitHub.
- Images are not stored persistently.
- Images only exist in the current browser session.
- Reloading the page removes all cards and image data.

Use only images that you have the right to use.

Do not add copyrighted artwork directly to this repository unless you have permission to do so.

## Known Limitations

- No persistent saving yet.
- Reloading the page clears all creatures and combat state.
- No JSON export/import yet.
- No separate DM and player pages yet.
- The public player preview is currently only a filtered view inside the same browser app.
- Because everything is still client-side, hidden information is not truly secure yet.
- No backend.
- No Node.js.
- No Express server.
- No database.
- No network access for other devices yet.
- No deployment setup yet.

## Important Architecture Note

The long-term goal is to have one shared encounter state.

Later, the DM view should receive the full encounter data, while the player view should receive only public data.

Secret values should not merely be hidden with CSS. They should not be sent to the player view at all.

This is not fully implemented yet, because the project is still a local browser-only prototype.

## Planned Features

Possible next steps:

- JSON export for the current encounter.
- JSON import to restore saved encounters.
- Persistent local storage.
- Separate DM and player views.
- Node.js and Express backend.
- Shared encounter state on the server.
- Public data filtering on the server.
- Local network access for players.
- Optional NAS deployment.
- Optional Electron or Tauri desktop version.

## Suggested Next Development Step

The next recommended development session is:

**Session 36: JSON Export and Import**

Goal:

Save the current cards, deck, hand, round, turn, HP, conditions, and images as a JSON file, then load that JSON file again later.

This would make the tracker much more useful for real session preparation.

## Project Structure

```text
D&D-Combat-Tracker/
├── index.html
├── style.css
├── app.js
└── Readme.md

## AI-Generated Images

Some demo character images in this repository were generated with ChatGPT/OpenAI image generation.

They are original character illustrations created for this project and are not intended to copy or reproduce official Dungeons & Dragons artwork, third-party character art, or copyrighted franchise characters.

These images are included only as demo/test assets for the combat tracker.
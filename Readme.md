# Miriel’s Deck of Encounters

v0.4.3 by kuro

A card-based fantasy tabletop encounter and initiative tracker for d20-style roleplaying games.

This is an unofficial personal learning project. It is not affiliated with, endorsed, sponsored, or approved by any tabletop roleplaying game publisher.

## Current Status

This project is currently a local browser-only web app built with:

- HTML
- CSS
- JavaScript

There is currently no backend, no database, and no server-side save system.

The app runs locally in the browser by opening `index.html`.

The current version already uses browser-local saving with `localStorage` and local tab synchronization. This means the current encounter can survive a page reload in the same browser, but it is still not a real database or server-backed save system.

## Implemented Features

### Core Card System

- Create creature cards.
- Create multiple copies of the same creature at once.
- Separate internal DM name and public player-facing name.
- Creature types:
  - Player
  - NPC
  - Monster
- Card zones:
  - Cards on hand
  - Card deck
- Only cards on hand participate in the current encounter.
- Move individual cards between hand and deck.
- Move all cards or cards of a specific type between hand and deck.
- Select multiple deck cards and move only the selected cards onto the hand.
- Remove individual cards.
- Delete all cards.

### Combat Tracking

- Initiative-based turn order.
- Automatic sorting by initiative.
- Round and turn counter.
- Previous turn and next turn controls.
- Active card highlight.
- Encounter cleanup actions:
  - Reset turn counter.
  - Remove all temporary HP.
  - Clear conditions from all cards currently on hand.

### Creature Data

Each creature card currently supports:

- Internal DM name.
- Public player-facing name.
- Creature type.
- Initiative.
- Current HP.
- Max HP.
- Temporary HP.
- Armor Class.
- Passive Perception.
- Passive Insight.
- Public HP visibility mode.
- Conditions.
- Image path or locally stored image data.
- Card zone state: on hand or in deck.
- Selection state for DM actions.

### Card Editing

Existing cards can be edited through the card menu.

The card editor currently supports editing:

- Internal name.
- Public name.
- Type.
- Initiative.
- Current HP.
- Max HP.
- Temporary HP.
- Armor Class.
- Passive Perception.
- Passive Insight.
- Public HP visibility mode.
- Image path or a newly selected local image file.
- Whether the card is currently on the hand.
- Conditions by checkbox list.

### Combat Actions

For selected cards currently on the hand, the DM can:

- Apply damage.
- Apply healing.
- Set temporary HP.
- Add a condition.
- Remove a condition.

Damage is applied to temporary HP first before reducing normal HP.

### Conditions

Implemented condition handling includes:

- Add and remove conditions through group actions.
- Edit a card’s conditions directly in the card editor.
- Display conditions as colored chips.
- Use official D&D 5e condition names.
- Additional support for `concentrating` as a practical combat marker.

### Public Player Preview

The current player preview shows public combat information based on the cards currently on hand.

It includes:

- Current round.
- Current turn.
- The creature currently taking its turn.
- Previous card.
- Main displayed card.
- Next card.
- Public initiative ribbon.
- Public HP display based on the selected visibility mode.
- Publicly visible conditions.

Players can click a card in the public initiative ribbon to display it as the main card.

The large spotlight preview can also be navigated by horizontal trackpad scrolling, `Shift + mouse wheel`, or touch swiping on supported devices.

### DM View and Player View

The app can be opened in two view modes:

- DM view: `?view=dm`
- Player view: `?view=player`

The DM view shows the full encounter controls and all internal card data.

The player view hides DM-only interface sections and shows the public preview.

Both views currently still run inside the same browser app. This is useful for local testing and for a second tab or external monitor, but it is not yet secure separation.

### Local Saving and Tab Synchronization

The app stores the current encounter state in the browser with `localStorage`.

The state includes:

- Round number.
- Current turn index.
- Public preview selection.
- Combat log messages.
- All creature cards.
- Card zone state.
- HP and temporary HP.
- Conditions.
- Initiative values.
- Public HP visibility mode.
- Image data or image paths.

DM and player tabs can stay synchronized locally through `BroadcastChannel`, with a polling fallback for the player view.

### Encounter Export and Import

The current encounter can be exported as a JSON file and imported again later.

Importing an encounter replaces the current browser state.

Use JSON export for a more deliberate backup. Browser-local saving is convenient, but it is still tied to the current browser and device.

### Image Handling

Images selected through the form are currently processed locally in the browser.

There are two possible image cases:

- Project images can use local paths such as `Images/miriel_img.png`.
- Images selected through the browser form are stored as Base64 data in the current browser state and can make exported JSON files much larger.

Recommended card image format:

- Wide landscape format.
- Roughly 16:11.
- Good sizes:
  - `1200 × 825 px`
  - `900 × 620 px`

The card image frame uses `object-fit: cover`, so images fill the frame consistently. If the source image has a different aspect ratio, parts of the image can be cropped at the edges.

Use only images that you have the right to use.

Do not add copyrighted artwork directly to this repository unless you have permission to do so.

### UI Features

- Card-like layout inspired by trading card games.
- Horizontal card rows for hand and deck.
- Scroll buttons for card rows.
- Compact deck cards.
- Area menus for larger management actions.
- Collapsible public player preview.
- Collapsible new-card form.
- Header-based quick guide.
- Combat log for visible DM actions.
- Responsive layout for smaller screens.

## Color Logic

The app uses a simple color language:

- Gold highlights the active combat card or important fantasy UI framing.
- Blue highlights selected DM targets and selected deck cards.
- In the public preview, blue means the active turn card.
- In the public preview, gold means a manually selected preview card.

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

## Current Architecture

The app is currently a static browser app.

There is one shared encounter state in `app.js`.

The central creature list is stored in the `creatures` array. Rendering follows the pattern:

```text
State changes -> renderCards() -> UI is rebuilt from the current state
```

The code is organized into sections for:

- Global data and constants.
- View mode, browser storage, and tab synchronization.
- Card queries and sorting.
- Public preview selection helpers.
- DM card selection.
- Turn logic.
- Scroll and focus logic.
- Card movement and combat cleanup.
- HP and combat actions.
- Conditions.
- Image loading.
- Encounter export and import.
- Public player data.
- HTML generation.
- Card editing.
- New card creation.
- Rendering.

The project intentionally remains simple for now. The current focus is learning JavaScript, DOM rendering, state management, and application structure step by step before introducing a backend or module system.

## Important Architecture Note

The long-term goal is to have one shared encounter state.

Later, the DM view should receive the full encounter data, while the player view should receive only public data.

Secret values should not merely be hidden with CSS. They should not be sent to the player view at all.

This is not fully implemented yet, because the project is still a local browser-only prototype.

## Known Limitations
- Passive Investigation Value missing
- No backend.
- No Node.js.
- No Express server.
- No database.
- No real server-side persistent saving yet.
- Browser-local saving depends on the current browser and device.
- The player view is still part of the same browser app.
- Hidden information is not truly secure yet because everything is still client-side.
- No network access for other devices yet.
- No deployment setup yet.
- No user accounts.
- No server-side image upload.

## Planned Features

Possible future features include:

- Node.js and Express backend.
- Separate routes such as `/dm` and `/player`.
- Shared encounter state on the server.
- Public data filtering on the server.
- Local network access for phones, tablets, or a second monitor.
- More robust save/load management.
- Image upload through a backend.
- Optional NAS deployment.
- Optional desktop app packaging with Electron or Tauri.

## Project Structure

```text
Miriels-Deck-of-Encounters/
├── index.html
├── style.css
├── app.js
├── Readme.md
└── Images/
    ├── README.md
    ├── miriel_img.png
    ├── liora_img.png
    ├── suica_img.png
    └── borstibald_img.png
```

## AI-Generated Images

Some demo character images in this repository were generated with ChatGPT/OpenAI image generation.

They are original character illustrations created for this project and are not intended to copy or reproduce official tabletop RPG artwork, third-party character art, or copyrighted franchise characters.

These images are included only as demo/test assets for Miriel’s Deck of Encounters.

## Copyright, License, and Usage

Copyright (c) 2026 kuro.

No open-source license has been chosen for this project.

This means that the source code is publicly visible if this repository is public, but no permission is granted to copy, modify, redistribute, publish, reuse, sublicense, or incorporate the code into other projects without explicit written permission from the author.

All rights are reserved.

Do not copy, fork for reuse, modify, redistribute, publish, mirror, reupload, or use this project or parts of this project in another project without explicit written permission from the author.

### Image Assets

The images in the `Images/` folder are AI-generated character images created for this project.

They depict original player characters and encounter test assets and are included only as demo/test assets for Miriel’s Deck of Encounters.

The image assets are not licensed for reuse, redistribution, modification, publication, training datasets, commercial use, or use in other projects.

Do not copy, extract, reuse, edit, redistribute, republish, mirror, reupload, or use these images in any other project without explicit written permission from the author.

These images are not official artwork and are not intended to copy or reproduce official artwork, third-party character art, or copyrighted franchise characters.

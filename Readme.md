# Miriel’s Deck of Encounters

v0.4.0 by kuro

A card-based fantasy tabletop encounter and initiative tracker for d20-style roleplaying games.

This is an unofficial personal learning project. It is not affiliated with, endorsed, sponsored, or approved by any tabletop roleplaying game publisher.


## Current Status

This project is currently a local browser-only web app built with:

- HTML
- CSS
- JavaScript

There is currently no backend, no database, and no server-side persistent save system.

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
- Delete all cards.
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
- Add and remove conditions.
- Clear all temporary HP.
- Clear conditions from all cards currently on hand.
- Local image selection for creature cards.
- Demo cards with local image paths.
- JSON export for the current encounter.
- JSON import to restore a saved encounter.
- Public player preview with filtered information.
- Public preview spotlight navigation by clicking, horizontal scrolling, or swiping.
- Card-based DM layout with hand, deck, and public initiative ribbon.
- Player-View and DM-View in seperate tabs 

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

The large spotlight preview can also be navigated by horizontal trackpad scrolling, `Shift + mouse wheel`, or touch swiping on supported devices.

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

## Encounter Export and Import

The current encounter can be exported as a JSON file and imported again later.

The exported JSON includes:

- App format name
- Export timestamp
- Round number
- Current turn index
- Manual public preview selection
- All creature cards
- Card zone state
- HP and temporary HP
- Conditions
- Initiative values
- Public HP visibility mode
- Image data or image paths

Importing an encounter replaces the current browser state.

### Image Data in JSON

There are two possible image cases:

- Demo images use local paths such as `Images/miriel_img.png`.
- Images selected through the browser form are stored as Base64 data inside the current browser state and can make exported JSON files much larger.

Use only images that you have the right to use.

## Image Handling

Images selected through the form are currently processed locally in the browser.

At the moment:

- Images are not uploaded to a server.
- Images selected through the form are stored only in the current browser state.
- Images selected through the form can be included in exported JSON files.
- Reloading the page resets the browser state unless the encounter was exported and imported again.

Use only images that you have the right to use.

Do not add copyrighted artwork directly to this repository unless you have permission to do so.

## Known Limitations

- No automatic persistent saving yet.
- Reloading the page resets the current browser state unless an encounter was exported and imported again.
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

- Automatic local saving with `localStorage`.
- Separate DM and player views.
- Node.js and Express backend.
- Shared encounter state on the server.
- Public data filtering on the server.
- Local network access for players.
- Optional NAS deployment.
- Optional Electron or Tauri desktop version.
- DM control panel for turn management and future group effects.
- Group actions such as applying damage, healing, temporary HP, or conditions to multiple cards at once.

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
    └── suica_img.png
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

They depict original player characters and are included only as demo/test assets for Miriel’s Deck of Encounters.

The image assets are not licensed for reuse, redistribution, modification, publication, training datasets, commercial use, or use in other projects.

Do not copy, extract, reuse, edit, redistribute, republish, mirror, reupload, or use these images in any other project without explicit written permission from the author.

These images are not official artwork and are not intended to copy or reproduce official artwork, third-party character art, or copyrighted franchise characters.

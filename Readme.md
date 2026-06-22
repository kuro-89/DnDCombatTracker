# D&D Combat Tracker
v.0.1 by kuro

A browser-based D&D 5e combat tracker built with HTML, CSS and JavaScript.

The goal is to create a local web app for Dungeon Masters to manage combat encounters, initiative order, hit points, temporary hit points, armor class, passive values and conditions.

## Current status

This project is currently in an early browser-only phase.

Implemented so far:

- Static browser app using HTML, CSS and JavaScript
- Sort creatures by initiative
- Track the current turn and round
- Move to the previous or next turn
- Display active creature
- Display internal DM names and public names
- Manage HP, max HP and temporary HP
- Apply damage, healing and temporary HP
- Display armor class
- Display passive Perception and passive Insight
- Add and remove conditions
- Display conditions as colored chips
- Preview different public HP display modes

## Planned features

Planned future features include:

- Separate DM view and player view
- Shared encounter state
- Public player-facing encounter display
- Filtered public data so hidden DM information is not sent to the player view
- Creature and monster images
- Image upload
- Encounter save/load
- JSON-based persistence
- Local network access for phones, tablets or a second monitor
- Node.js and Express backend
- Separate routes such as `/dm` and `/player`
- Optional NAS deployment
- Optional desktop app packaging with Electron or Tauri
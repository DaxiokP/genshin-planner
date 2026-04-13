# Roadmap: Genshin Planner

This document tracks the project milestones and future development plans.

## Current Status: Foundation
- [x] Basic Vite + React setup.
- [x] GOOD format JSON import functionality.
- [x] Material inventory grid with rarity-based styling.
- [x] Local asset pipeline for icons and mapping.

---

## Phase 1: Ownership & Planner Core (In Progress)
Goal: Move from a static inventory view to a dynamic planning tool.

- [ ] **Own Characters Implementation**
    - Track talents, levels, and constellations.
- [ ] **Own Weapons Implementation**
    - Track levels and refinement levels.
- [ ] **Planner: Character Integration**
    - Add owned characters to the planner.
    - Set target levels and talent goals.
- [ ] **Planner: Weapon Integration**
    - Add owned weapons to the planner.
    - Set target levels.
- [ ] **Planner: Priority Management**
    - Allow reordering characters and weapons in the planner to prioritize specific material needs.

## Phase 2: Persistence & Database
Goal: Stability and expanding the scope of planning.

- [ ] **Data Persistence**
    - Implement a way to save progress (Local Storage, Cookies, or User Save File) to prevent data loss on refresh.
- [ ] **Global Character DB**
    - Allow adding characters that aren't in the user's import file.
- [ ] **Global Weapon DB**
    - Allow adding any weapon to the planner.
- [ ] **Requirements Visualization**
    - Show the exact materials needed to level up a character or weapon.

## Phase 3: Advanced UX
Goal: Filtering and refinement.

- [ ] **Enhanced Filtering**
    - Filter characters/weapons by Level, Element, and Weapon Type.

## Phase 4: Weapon-Character Synergy
Goal: Cross-referencing equipment.

- [ ] **Enhanced Character View**
    - Show which weapon each character has equipped.
- [ ] **Enhanced Planner**
    - Display equipped weapons directly on the character cards in the planner.
- [ ] **Enhanced Weapon View**
    - Show which character is currently using a specific weapon.
- [ ] **Optimization Algorithms**
    - (Planned) Auto-calculate the best domain farming route based on current priorities.

---

## Future Ideas
- "Ready to Ascend" notifications.
- Visual breakdown of "Mora needed" vs "Mora owned".
- Optimization Algorithms (Auto-calculate best domain farming routes).

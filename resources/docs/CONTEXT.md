# Context: Genshin Planner

This document provides high-level context and "Source of Truth" information about the project's domain, data formats, and development history.

## Project Purpose
The **Genshin Planner** is a specialized tool for Genshin Impact players. Unlike general calculators, it focuses on **inventory-aware planning**, allowing users to see exactly what they need to farm based on what they already own.

## Domain Language
- **GOOD Format**: Stands for **Genshin Optimizer Data**. It is the community-standard JSON format for exporting character, weapon, and material data from the game (via scanners like Akasha Scanner or Inventory Kamera).
- **Ascension Materials**: Items required to increase a character or weapon's level cap. These include boss drops, local specialties, and common enemy drops.
- **Talent Books**: Materials required to level up character abilities (Normal Attack, Skill, Burst).
- **Mora**: The primary in-game currency.

## Development Context & Evolution
- **Inventory Labels**: All material labels are editable to allow for better customization regardless of whether an item was imported or manually added.
- **Local-First with Cloud Sync Philosophy**: The project uses a hybrid data model:
  - **Speed & Privacy First**: All data processing, delta calculations, and rendering occur entirely in the client browser, maintaining sub-millisecond responsiveness.
  - **Offline Storage**: Guest (logged out) users are saved under a single Local Storage namespace: `genshin_planner_local_data`. In this offline-only mode, the profile dropdown switcher is fully hidden.
  - **Supabase Cloud Sync**: Signed-in users automatically sync their dynamic profile configurations with a Supabase cloud database instance in a debounced, crash-safe background worker.
- **Username Auth Layer**: Logins use clean, alphanumeric usernames rather than exposing emails. Client-side controllers transparently handle MX-valid Gmail mapping under the hood (`username ➔ username.planner@gmail.com`) to register smoothly on Supabase, while keeping all user-facing components clean and strictly username-oriented.
- **Dynamic Switcher & Deletion**: Authenticated accounts can swap, create, and delete multiple custom profiles directly from the navigation bar. Deletion uses event propagation controls to avoid switching profiles, and is strictly boundary-checked (hidden when only one profile remains) to ensure account integrity.
- **Data Scraping**: The project uses custom scripts (`resources/scripts/downloadIcons.cjs`, `resources/scripts/generateMap.cjs`) to extract data from game databases. If material data is missing, these scripts should be updated rather than hardcoding data in `App.tsx`.

## Coding Conventions for Agents
- **Consistency**: Keep core state coordinates and layout structures in `App.tsx`, and split standalone visual forms/modals into `src/components/` (e.g. `AuthModal.tsx`).
- **Styling**: Prefer vanilla CSS in `App.css` and use standard CSS variables. Ensure new components maintain the glassmorphic dark theme, incorporating premium transition speeds and active state highlighting.
- **Naming**: Use camelCase for variables/functions and PascalCase for components.
- **Error Handling**: Always provide user-facing error messages (displayed in modals or headers) for file parsing, authentication rate limits, and network connection errors.

## Common Pitfalls
- **Key Mismatches**: The GOOD format uses PascalCase (e.g., `SlimeSecretions`), while the internal `src/maps/materialMap.json` often uses lowercase (e.g., `slimesecretions`). Always use `.toLowerCase()` when comparing keys.
- **Missing Icons**: If an icon is missing, the app should fallback to a generated avatar with the item's initials.


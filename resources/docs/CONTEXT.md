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
- **Planner Layout & Symmetrical Transitions**: The active planner cards feature perfectly centered, widely spaced transitions (`[Current]   ➔   [Desired]`) for levels and talents, styled with an inline ascension spark (`✦`) next to level bounds. The right-hand content column utilizes a precise right-padding offset (`28px`) to shift absolute-positioned labels (`Attack`, `Skill`, `Burst`) safely inward, completely preventing card clipping.
- **Rarity Branding**: Character nameplate banners automatically match the character's native rarity: 4★ characters display a premium purple name plate, while 5★ characters display a premium gold-brown name plate.
- **Compact Material Cells with Center Zoom**: To provide a clean grid experience, required materials are displayed in a high-density, 5+ columns per row grid using compact `50px` cells. Material icons are scaled up and centered via `1.35x` transformations, clipping out empty transparent card margins. Complete satisfaction is highlighted by darkening/dimming cells in grayscale and showing translucent checkmarks.
- **Mora & XP Estimations**: Mora and Hero's Wits bypass standard `owned/needed` counter layouts, instead showing a clean `~needed` estimation value for high-glance utility.
- **Inventory-Aware Interactive Character Upgrades**: Clicking the card's Upgrade button opens a dedicated wizard with alchemical recipes, crafting bonus overlays, and a final verification screen that safely deducts Mora/EXP/materials from the user's inventory.
- **Alchemical Conversions & Clamping Math**:
    * Displays material cell progress in the upgrade grid in a `#ClampedOwned / #Required` format (e.g. `33/33` or `28/114`).
    * Hero's Wit uses an equivalent EXP sufficiency check ($20\text{k}/5\text{k}/1\text{k}$ EXP book ratios). Satisfied cards display `#Required / ~#Required` and light up green, while unsatisfied ones display `#EquivalentOwned / ~#Required` and light up red.
    * The Craft list filters out empty items, and the Crafting Bonus pane lists all tiers of drops in active chains.
- **Sequential Back Navigation & Edit Flows**: When editing a character's planner from the dashboard, cancelling/closing the `CharacterTargetModal` uses a dynamic redirect check (`openedTargetFromPlanner` state) to return the user directly to the Planner board, preventing disruptive transitions to the general character selection modal.
- **Planner Priority Reordering Systems**: Changing progression weight priority is supported in two ways:
  1. A standalone visual **Priority Manager Modal** featuring immediate visual drag-swaps of character rows while preserving original saved order number badges next to them until save confirmation.
  2. Direct **Grid Card Drag-and-Drop** reordering, strictly restricted to clicks originating on the card's header bar, calculating mouse offsets to insert *before* (left-half) or *after* (right-half) target cards, utilizing a golden neon glowing edge overlay border drop cue for high visual confidence.
- **Card-Wide Standby Fading**: Grayscale and opacity filters are applied to the outermost card container element instead of only the body, causing the entire plan (header, name, action buttons, portrait, and material list) to fade together in a unified transition when placed on standby.
- **Page Layout Lock & Aligned Leveling**:
  * Page tabs are centered mathematically and frozen in place using a 3-column CSS Grid (`1fr auto 1fr`) on the `.header`, preventing tab shifting when the Cloud Sync status badge size changes.
  * Planner cards maintain a strictly fixed header `height: '46px'` to keep all items aligned, while wrapping longer character and weapon names using dynamic font auto-scaling (`0.8rem` vs `0.95rem` vs `1.15rem` based on character length) and vertical `-webkit-box` multi-line text clamping.
  * The active tab defaults to `'planner'` rather than `'inventory'` to bring the user's progress card board into primary focus upon initialization or page refresh.
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


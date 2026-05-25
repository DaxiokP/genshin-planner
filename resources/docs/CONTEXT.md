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
- **Planner Layout & Symmetrical Transitions**: The active planner cards feature perfectly centered, widely spaced transitions (`[Current]   ➔   [Desired]`) for levels and talents, styled with an inline ascension spark (`✦`) next to level bounds. The right-hand content column utilizes a precise right-padding offset (`28px`) to shift absolute-positioned labels safely inward, completely preventing card clipping.
- **Rarity Branding**: Card header nameplate banners automatically match the item's native rarity: 4★ characters/weapons display a premium purple banner, while 5★ characters/weapons display a premium gold-brown banner.
- **Compact Material Cells with Center Zoom**: To provide a clean grid experience, required materials are displayed in a high-density, 5+ columns per row grid using compact `50px` cells. Material icons are scaled up and centered via `1.35x` transformations, clipping out empty transparent card margins. Complete satisfaction is highlighted by darkening/dimming cells in grayscale and showing translucent checkmarks.
- **Mora, EXP & Ore Estimations**: Mora, Hero's Wits, and Mystic Enhancement Ores bypass standard `owned/needed` counter layouts, instead showing clean `~needed` estimation values for high-glance utility.
- **Inventory-Aware Interactive Upgrades**: Clicking the card's Upgrade button opens a dedicated wizard with alchemical recipes, crafting bonus overlays, and a final verification screen that safely deducts Mora/EXP/Ores/materials from the user's inventory.
- **Alchemical Conversions & Clamping Math**:
    * Displays material cell progress in the upgrade grid in a `#ClampedOwned / #Required` format (e.g. `33/33` or `28/114`).
    * Hero's Wit and Mystic Enhancement Ore use equivalent EXP sufficiency checks ($20\text{k}/5\text{k}/1\text{k}$ EXP book ratios and $10\text{k}/2\text{k}/0.4\text{k}$ ore ratios). Satisfied cards display `#Required / ~#Required` and light up green, while unsatisfied ones display `#EquivalentOwned / ~#Required` and light up red.
    * The Craft list filters out empty items, and the Crafting Bonus pane lists all tiers of drops in active chains (including group 600 weapon materials).
- **Sequential Back Navigation & Edit Flows**: When editing a plan from the dashboard, cancelling/closing the `TargetModal` uses a dynamic redirect check (`openedTargetFromPlanner` state) to return the user directly to the Planner board, preventing disruptive transitions to the general selection modals.
- **Planner Priority Reordering Systems**: Changing progression weight priority is supported in two ways for a mixed list of characters and weapons:
  1. A standalone visual **Priority Manager Modal** featuring immediate visual drag-swaps of item rows while preserving original saved order number badges next to them until save confirmation.
  2. Direct **Grid Card Drag-and-Drop** reordering, strictly restricted to clicks originating on the card's header bar, calculating mouse offsets to insert *before* (left-half) or *after* (right-half) target cards, utilizing a golden neon glowing edge overlay border drop cue for high visual confidence.
- **Card-Wide Standby Fading**: Grayscale and opacity filters are applied to the outermost card container element instead of only the body, causing the entire plan (header, name, action buttons, portrait, and material list) to fade together in a unified transition when placed on standby.
- **Page Layout Lock & Aligned Leveling**:
  * Page tabs are centered mathematically and frozen in place using a 3-column CSS Grid (`1fr auto 1fr`) on the `.header`, preventing tab shifting when the Cloud Sync status badge size changes.
  * Planner cards maintain a strictly fixed header `height: '46px'` to keep all items aligned, while wrapping longer character and weapon names using dynamic font auto-scaling (`0.8rem` vs `0.95rem` vs `1.15rem` based on character length) and vertical `-webkit-box` multi-line text clamping.
  * The active tab defaults to `'planner'` rather than `'inventory'` to bring the user's progress card board into primary focus upon initialization or page refresh.
- **Local-First with Cloud Sync Philosophy**: The project uses a hybrid data model:
  - **Speed & Privacy First**: All data processing, delta calculations, and rendering occur entirely in the client browser, maintaining sub-millisecond responsiveness.
  - **Offline Storage**: Guest (logged out) users are saved under a single Local Storage namespace: `genshin_planner_local_data`. In this offline-only mode, the profile dropdown switcher is fully hidden.
  - **Supabase Cloud Sync**: Signed-in users automatically sync their dynamic profile configurations (including `planned_items`) with a Supabase cloud database instance in a debounced, crash-safe background worker.
- **Username Auth Layer**: Logins use clean, alphanumeric usernames rather than exposing emails. Client-side controllers transparently handle MX-valid Gmail mapping under the hood (`username ➔ username.planner@gmail.com`) to register smoothly on Supabase, while keeping all user-facing components clean and strictly username-oriented.
- **Dynamic Switcher & Deletion**: Authenticated accounts can swap, create, and delete multiple custom profiles directly from the navigation bar. Deletion uses event propagation controls to avoid switching profiles, and is strictly boundary-checked (hidden when only one profile remains) to ensure account integrity.
- **Data Scraping**: The project uses custom scripts (`resources/scripts/downloadIcons.cjs`, `resources/scripts/generateMap.cjs`) to extract data from game databases. If material data is missing, these scripts should be updated rather than hardcoding data in `App.tsx`.
- **Contiguous Locked Filters & Transparent Elemental Fills**:
  * Character and Weapon filter panels are built with contiguous, joined `.filter-button-group` boxes without text labels (icons-only for weapons/elements).
  * Selection uses the smart `handleFilterToggle` logic: first click isolates, other clicks additively select, and clicking the last active resets to all active.
  * Explicit, static button widths (weapons: `96px`, elements: `92px`, rarities: `88px`, sort-by: `110px`, sort-order: `135px`) and a locked `44px` width for `.badge-count-pill` prevent any horizontal layout shifts.
  * Active buttons are filled with elegant, subtle transparent overlays (`rgba(X, Y, Z, 0.15)`) and solid glowing bottom borders, preserving natural colored icons and matching the glassmorphic dark theme.
- **Hidden Multi-Tier Sorting Cascade**:
  * Sorting the character roster by Level triggers a three-stage sorting cascade: **Level ➔ Rarity ➔ Alphabetic (Name)**. Rarity sorting matches the active sort direction, while display name A-Z serves as the stable final fallback.
- **Weapon Selection Modal Overhaul**:
  * Overhaul matches the character selection layout: displays standard visual grids using `.char-select-grid` and `.char-select-item` classes.
  * Level and refinement R1-R5 are aligned in the top-left using `.char-select-level-container` and custom gold-colored refinement badges.
  * Equipped characters are overlaid in a clean, semi-translucent dark badge at the bottom-center inside the icon wrapper (`.material-icon-wrapper`), hiding completely for unequipped inventory weapons.
  * Weapon type category filter buttons use highly visible soft-white inactive silhouettes and glowing gold active silhouettes, positioned next to the rarity filter on the second row.
  * Search and Star/Abc sorting toggles are aligned on the top row, supporting instant sorted cascades.
  * Names support 2-line centered wrapping with custom WebkitLineClamps and fixed-height alignments to keep the selection grid visually clean.
## Coding Conventions for Agents
- **Consistency**: Keep core state coordinates and layout structures in `App.tsx`, and split standalone visual forms/modals into `src/components/` (e.g. `AuthModal.tsx`).
- **Styling**: Prefer vanilla CSS in `App.css` and use standard CSS variables. Ensure new components maintain the glassmorphic dark theme, incorporating premium transition speeds and active state highlighting.
- **Naming**: Use camelCase for variables/functions and PascalCase for components.
- **Error Handling**: Always provide user-facing error messages (displayed in modals or headers) for file parsing, authentication rate limits, and network connection errors.

## Common Pitfalls
- **Key Mismatches**: The GOOD format uses PascalCase (e.g., `SlimeSecretions`), while the internal `src/maps/materialMap.json` often uses lowercase (e.g., `slimesecretions`). Always use `.toLowerCase()` when comparing keys.
- **Missing Icons**: If an icon is missing, the app should fallback to a generated avatar with the item's initials.


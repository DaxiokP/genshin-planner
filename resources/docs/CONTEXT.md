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
- **Rarity Branding**: Card header nameplate banners automatically match the item's native rarity: 4★ characters/weapons display a premium purple banner, while 5★ characters/weapons display a premium gold-brown banner. Weapon avatar frames in the planner further echo this with dedicated `.weapon-rarity-*` CSS classes whose gradient values mirror the header colours exactly.
- **Planner Single-Value Transitions**: When a planner card's current value already equals the desired value (level or talent), the row renders a single centred number rather than `90 ➔ 90`. The arrow layout only appears when there is an actual gap to fill.
- **Stable Material Tooltips**: Hovering a material tile fires `getBoundingClientRect()` and anchors the tooltip to `{ x: rect.right + 12, y: rect.top }`. The `<TooltipBox>` component in `App.tsx` clamps this position within the viewport so the tooltip never escapes screen bounds. All `onMouseMove` handlers have been removed to prevent layout thrashing and jitter.
- **Symmetric Planner Card Heights**: Both character and weapon card body rows use a fixed `height: '146px'` flex container. Avatar frames (120×120px) centre inside it, and the levels/talents column aligns its content from the top (`justifyContent: 'flex-start'`). This guarantees the divider line and "Required Materials" header pixel-align side-by-side regardless of content differences.
- **GOOD Import Planner Sync**: Importing a new GOOD file automatically calls `reconcilePlannedItemsWithGOOD()` (`src/utils/plannerImportSync.ts`), which advances each plan's `current` values to match the newly imported data if the import levels/talents meet or exceed what was previously recorded. Plans are never duplicated.
- **Show Done Character Filter**: `CharacterSelectionModal` hides characters whose current state already satisfies their planned target by default. A "Show Done" toggle reveals them dimmed with a DONE badge, keeping the selection grid focused on actionable items.
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
- **Account Settings & Profile Management**: Profile operations (create, rename, delete) and GOOD data import/clear have been moved out of the header dropdown and into a dedicated `AccountSettingsTab` page. The header profile dropdown now only handles quick profile switching and provides a link to Account Settings. This keeps the header clean and gives users a proper settings context.
- **Dynamic Switcher (Header)**: Authenticated accounts can swap profiles directly from the header dropdown. The dropdown is fully hidden in offline guest mode.
- **No Upload Wall on First Load**: New users (or users with no imported GOOD data) are no longer blocked by a fullscreen upload screen. The app loads directly to the Planner tab. Empty states in `CharactersTab` and `WeaponsTab` display a contextual message directing users to *Account Settings* to import their GOOD file. This keeps the onboarding flow non-blocking and intuitive.
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
- **Global Inventory Allocation & Summary Panel**:
  * Material consumption and alchemical crafting cascades are computed sequentially across enabled planner cards in order of priority.
  * Earlier cards exhaust available inventory first, while subsequent cards display calculated deficits, completely preventing resource double-counting.
  * Compiles a left-side aggregate Summary panel listing all missing items and mapping them to weekly domain farming schedules.
- **Daily Domain Materials Farmable Tracker**:
  * Renders at the top of the Summary panel, displaying a real-time UTC-relative 3:00 AM reset countdown (fully compatible with Europe/Portugal daylight savings transitions).
  * Uses left and right chevrons to navigate days of the week, displaying the day's name (or "Today" for the active server day).
  * Prevents navigating back to past days by programmatically disabling the left chevron at index 0.
  * Correctly groups and pools all farmable missing materials under Sunday catch-all configurations.
- **Planner-Only Quick Inventory Modal**:
  * Integrates a localized, context-aware quick editor launched directly by clicking material requirement icons across Character/Weapon cards and summary panels.
  * Displays title values using pure material/boss names (e.g. removing the "Quick Edit:" prefix).
  * Implements bidirectional live math updates between *Inventory* and *Add/Subtract* (Delta) fields, preventing key locking, supporting $60,000$ Mora leyline triggers, and clamping at $0$.
  * Structures section columns using content-snug flex wrappers and dynamic grids ($3\text{--}4$ groups $\rightarrow 2 \times 2$, $5\text{--}6$ groups $\rightarrow 3 \times 2$, $7\text{--}9$ groups $\rightarrow 3 \times 3$) to maintain extreme visual symmetry and tightness.
  * Preserves global mouse tracking tooltips on modal item icon hovers.
- **Modularization & Hook Decomposition**:
  * Cleanly split the giant 3,000+ line `App.tsx` and `App.css` god-files into a modular technical layout.
  * Centralized auth, profile state selectors, legacy data migrations, and debounced Supabase database upserts inside the custom React hook `src/hooks/useAppSync.ts`.
  * Created dedicated page tab views inside `src/components/tabs/` (`PlannerTab.tsx`, `InventoryTab.tsx`, `CharactersTab.tsx`, `WeaponsTab.tsx`, `AccountSettingsTab.tsx`) and `src/components/SummaryPanel.tsx`.
  * Decoupled CSS styling into 6 component-specific CSS stylesheets (`PlannerTab.css`, `InventoryTab.css`, `CharactersTab.css`, `WeaponsTab.css`, `SummaryPanel.css`, `AccountSettingsTab.css`), reducing the global `App.css` to global variables, animations, and modals.
  * Enforced strict type-safety interfaces (`src/types.ts`) and isolated filter/formatting utility helpers (`src/utils/filterHelpers.ts`, `src/utils/formatHelpers.ts`) to avoid circular import loops while maintaining 100% visual layout parity and perfect compile integrity.

## Coding Conventions for Agents
- **Consistency**: Keep core state coordinates and layout structures in `App.tsx`, and split standalone visual forms/modals into `src/components/` (e.g. `AuthModal.tsx`).
- **Automated Testing**: For mathematical models (calculations, alchemical crafting cascades, sequential priority allocation) and import sync reconciliations, prioritize writing/maintaining unit tests under `src/utils/__tests__/`. We use Vitest in a pure Node environment. Avoid complex UI component tests or E2E scripts to keep setup and maintenance minimal for this 2-person project, focusing strictly on high-value "brain" logic.
- **Styling**: Prefer vanilla CSS in `App.css` and use standard CSS variables. Ensure new components maintain the glassmorphic dark theme, incorporating premium transition speeds and active state highlighting.
- **Naming**: Use camelCase for variables/functions and PascalCase for components.
- **Error Handling**: Always provide user-facing error messages (displayed in modals or headers) for file parsing, authentication rate limits, and network connection errors.

## Common Pitfalls
- **Key Mismatches**: The GOOD format uses PascalCase (e.g., `SlimeSecretions`), while the internal `src/maps/materialMap.json` often uses lowercase (e.g., `slimesecretions`). Always use `.toLowerCase()` when comparing keys.
- **Missing Icons**: If an icon is missing, the app should fallback to a generated avatar with the item's initials.

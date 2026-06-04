# Roadmap: Genshin Planner

This document tracks the project milestones and future development plans.

## Current Status: Foundation
- [x] Basic Vite + React setup.
- [x] GOOD format JSON import functionality.
- [x] Material inventory grid with rarity-based styling.
- [x] Local asset pipeline for icons and mapping.

---

## Phase 1: Ownership & Planner Core (Completed)
Goal: Move from a static inventory view to a dynamic planning tool.

- [x] **Own Characters Implementation**
    - Track talents, levels, and constellations.
- [x] **Own Weapons Implementation**
    - Track levels and refinement levels.
- [x] **Planner: Character Integration**
    - Add owned characters to the planner.
    - Set target levels and talent goals.
- [x] **Planner: Weapon Integration**
    - Add owned weapons to the planner.
    - Set target levels.
- [x] **Planner: Priority Management**
    - Allow reordering characters and weapons in the planner to prioritize specific material needs.

## Phase 2: Persistence, Multi-Profile & Cloud Sync (Completed)
Goal: Stability, cross-device persistence, and shared account workflows.

- [x] **Data Persistence (Dual Mode)**
    - *Offline Guest Mode*: Seamlessly save and load state under the `genshin_planner_local_data` localStorage namespace key for guest users.
    - *Supabase Sync Mode*: Automatically sync and read state from a PostgreSQL cloud database using debounced background syncs to prevent database performance bottlenecks.
- [x] **Username Authentication Layer**
    - Alphanumeric Username logins (signup/signin) bypassing standard email flows.
    - Internally maps usernames to active MX domain formats (`username.planner@gmail.com`) to bypass Supabase server email verification requirements while keeping the frontend 100% clean and username-only.
- [x] **Account Sharing & Multi-Profile Switcher**
    - Allows multiple custom profiles to be created and stored under a single shared account.
    - Seamless header dropdown switcher to create, initialize, and swap profiles in real time.
    - Fully hides the dropdown switcher in offline guest mode to keep the UI clean.
- [x] **Safety-Locked Profile Deletion**
    - Interactive deletion of custom profiles from the switcher row via a red hover trash icon (`Trash2`).
    - Event propagation controls prevent unwanted page refreshes or accidental profile switching.
    - Hard boundary safety check (`profiles.length > 1`) hides the delete action on the last remaining profile, ensuring accounts are never left profile-less.
- [x] **Global Database Schema & CI/CD Pipelines**
    - Compound primary key constraints on `(user_id, profile_name)` to allow flexible profile rows.
    - Automated GitHub Actions deployment workflows injecting Supabase keys for ready-to-run builds on GitHub Pages.

## Phase 3: Global Databases & Requirements (Completed)
Goal: Expanding the scope of planning.

- [x] **Requirements Visualization**
    - Show the exact materials needed to level up a character or weapon with full cost tracking and inventory integrations.
- [x] **Inventory-Aware Upgrades & Crafting Simulations**
    - Replace instant promotions with a robust alchemical crafting simulation engine.
    - Added top-down Cascading requirement propagation and bottom-up craft simulators.
    - Integrated dynamic progress bars, all-tier alchemical bonus sliders, and a final Mora/EXP verification modal.

## Phase 4: Advanced UX & Optimization (Completed)
Goal: Filtering, refinement, and optimization.

- [x] **Enhanced Filtering & Contiguous Badge Groups**
    - Filter characters and weapons by weapon type, element, and rarity, all selected by default.
    - Joined buttons into contiguous `.filter-button-group` boxes with explicit labels removed.
    - Displayed only icons and dynamic count badge pills (`active/total`) with real-time cross-filtering.
    - Locked all button and count pill widths statically to eliminate layout shifting.
    - Styled active segments with subtle transparent element washes (`rgba(X, Y, Z, 0.15)`) and solid glowing bottom borders, preserving colorful native icons.
- [x] **Multi-Tier Level Sorting Cascade**
    - Level sorting on the characters tab cascades through Level ➔ Rarity ➔ Alphabetic (Name) to resolve identical level bounds cleanly.
- [x] **Enhanced Character View**
    - Show which weapon each character has equipped.
- [x] **Enhanced Planner**
    - Display equipped weapons directly on the character cards in the planner.
- [x] **Enhanced Weapon View**
    - Show which character is currently using a specific weapon.
- [x] **Global Sequential Inventory Allocation & Summary Panel**
    - Consume materials and craftable stock sequentially based on active priority order.
    - Compile a left-side aggregate Summary panel listing missing items and mapping them to weekly domain farming schedules.
    - Real-time recalculations when cards are reordered, edited, or toggled on standby.
- [x] **Planner-Only Quick Inventory Modal**
    - Click material requirement icons on Character/Weapon planner cards and global summary tiles to edit inventory counts or delta values in place.
    - Implemented content-snug containers and dynamic grid rules ($3\text{--}4$ groups $\rightarrow 2 \times 2$, $5\text{--}6$ groups $\rightarrow 3 \times 2$, $7\text{--}9$ groups $\rightarrow 3 \times 3$) for layout symmetry.
    - Added bi-directional synchronization mathematics, input-clamping safety bounds, a quick-action $+60,000$ Mora leyline trigger, and global mouse-tracking tooltip integration.

## Phase 5: Optimization Algorithms (In Progress)
Goal: Optimization Algorithms for the planner, and improving the user experience.

- [x] **Planner improves**
    - Remove maxed out characters from the select target modal — Added "Show Done" toggle to `CharacterSelectionModal.tsx`; completed characters are hidden by default and marked with a DONE badge when revealed.
    - Update planner on Good file import — `reconcilePlannedItemsWithGOOD()` in `src/utils/plannerImportSync.ts` auto-syncs planned current levels/talents after each GOOD import.
    - Mouse hover over material improves — Tooltips now anchor stably to the right of the hovered tile (`x = rect.right + 12, y = rect.top`) via `<TooltipBox>` in `App.tsx`, with viewport clamping. Removed all `onMouseMove` jitter.
    - Improve weapon card to match the character card style — Both card body rows fixed at `146px` height; avatar frames, dividers, and "Required Materials" headers align pixel-perfectly. Weapon icon backgrounds now use `weapon-rarity-*` gradient classes matching card header colours.
    - Visually improve the planner numbers representation — Level and talent rows render a single value (e.g. `90`) instead of `90 ➔ 90` when current equals desired.
    - Automated Testing Suite ("Lazy & Effective" Setup) — Installed Vitest under pure Node execution. Created automated unit test suites in `src/utils/__tests__/` to validate core requirement calculations, EXP/Ore equivalency models, alchemical cascading crafting, and duplicate weapon import synchronization, preventing regression bugs.
    - Active Tab Persistence — The active tab is now persisted to `localStorage` under `genshin_planner_active_tab`, so the user's last-viewed tab is restored on page reload.
- [x] **Improve Inventory page**
    - Better sorting and filtering — Materials now sort by `sortGroup` → `sortRank` → `rarity (descending)`. A `<select>` category dropdown filters by group (Character & Weapon, Weekly Boss, Gems, Talent Books, etc.).
    - Better UI — "Import Materials" button (with Upload icon) replaces the old import logic; "Clear Inventory" is now a red Trash icon button that triggers a custom in-app confirmation modal (`ClearInventoryConfirmationModal.tsx`) instead of a browser dialog. Button styles aligned with the `.planner-btn` pattern.
- [x] **Global Import Data & Settings**
    - Add an Account Settings page (`AccountSettingsTab.tsx`) accessible from the profile dropdown in the header.
    - Profiles section - View, create, rename, and delete profiles from the settings page.
    - Profile Data section - Import a GOOD format file (Characters, Weapons, Materials, Artifacts) and clear all imported data per profile.
    - Remove the full-screen "Upload Wall" that blocked new users — empty accounts now land on the Planner directly.
    - Updated empty states in `CharactersTab` and `WeaponsTab` to guide users to Account Settings when no import data is found.
- [x] **Manage planner priority**
    - Redesigned the priority modal with an adaptive multi-column layout (≤30 items → 10 rows/col, 30–60 items → 15 rows/col, >60 items → single scrollable column).
    - Fixed a bug where character priority positions were always displayed as `0` (caused by a key mismatch between `savedOrder` and `id` construction).
    - Reduced row item padding and increased icon zoom (135 % for characters, 110 % for weapons) for a compact, tight grid feel.
    - Disabled planner cards now display their required materials calculated against an empty (0) inventory, with a grey "Disabled" badge replacing the old status tags. Material icons remain fully clickable.
    - Quick Inventory modal inputs now auto-select their contents on focus for fast overriding.
- [ ] **Allow "Custom" Character or Weapons on the planner**
    - Allow adding custom characters to the planner (which will not have an associated good file data or existing character from the game)
    - Allow adding custom weapons to the planner (which will not have an associated good file data or existing weapon from the game)
- [ ] **Toggle to highlight "Ready to upgrade" characters/weapons**
    - If a toggle is enabled, it will highlight characters/weapons that are "Ready to upgrade"

## Phase 6: Add characters/weapons not in Good file (In Progress)
Goal: Allow users to add characters and weapons to the planner that aren't in their import file.

- [ ] **Add Character not in Good file**
    - Allow adding characters that aren't in the user's import file but are characters from the game
- [ ] **Add Weapon not in Good file**
    - Allow adding weapons that aren't in the user's import file but are weapons from the game

## Phase 7: Keep track with game releases (In Progress)
Goal: Keep track with the new characters and weapons that are released in the game, and update the web page to reflect the changes.

- [ ] **Update character data**
    - Get the latest character data from the game and update the web page to reflect the changes.
- [ ] **Update weapon data**
    - Get the latest weapon data from the game and update the web page to reflect the changes.


## Phase X: Future Ideas
Goal: Implement additional features that are not related to the planner, but would be useful for users.

- [ ] **Add week schedule view**
    - Create a new button+modal that shows a week timeline that shows which character or weapon is available to farm for materials on that specific day
        - Example: Monday - Character A and Weapon B need materials that can be farmed on Monday, so show Character A and Weapon B in a list under Monday
        - Example: Tuesday - Character C and Weapon D need materials that can be farmed on Tuesday, so show Character C and Weapon D in a list under Tuesday
        - if we hover over a character/weapon card, it should show a tooltip that shows which materials we can farm
- [ ] **Optimization Algorithms**
    - Auto-calculate the best domain farming route based on current priorities.
    - Best days to farm for materials for characters and weapons.
- [ ] **Inspect characters and weapons**
    - Allow users to inspect a character and see their stats, talents, weapon details, skill scaling and artifact builds.
    - This requires us to get the character data from the import file, and use our own API for the character data.
- [ ] **Artifacts**
    - Add a section for artifacts where users can track their artifacts.
- [ ] **Global Character DB**
    - Add all characters to the a different page, where we can check the material and talent book requirements for each character without needing to import the character first. 
- [ ] **Global Weapon DB**
    - Add all weapons to the a different page, where we can check the material requirements for each weapon without needing to import the weapon first.

---

## Notes & Ideas
- "Ready to Ascend" notifications.


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

## Phase 3: Global Databases & Requirements (In Progress)
Goal: Expanding the scope of planning.

- [ ] **Global Character DB**
    - Allow adding characters that aren't in the user's import file.
- [ ] **Global Weapon DB**
    - Allow adding any weapon to the planner.
- [x] **Requirements Visualization**
    - Show the exact materials needed to level up a character or weapon with full cost tracking and inventory integrations.
- [x] **Inventory-Aware Upgrades & Crafting Simulations**
    - Replace instant promotions with a robust alchemical crafting simulation engine.
    - Added top-down Cascading requirement propagation and bottom-up craft simulators.
    - Integrated dynamic progress bars, all-tier alchemical bonus sliders, and a final Mora/EXP verification modal.


## Phase 4: Advanced UX & Optimization (Completed)
Goal: Filtering, refinement, and routes.

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
- [ ] **Optimization Algorithms**
    - (Planned) Auto-calculate the best domain farming route based on current priorities.

---

## Future Ideas
- "Ready to Ascend" notifications.
- Visual breakdown of "Mora needed" vs "Mora owned".
- Optimization Algorithms (Auto-calculate best domain farming routes).


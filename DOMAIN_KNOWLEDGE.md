# Genshin Impact Domain Knowledge

This document serves as a reference for the core game mechanics and terminology used in the Genshin Planner. It is particularly useful for AI agents and new contributors to understand the business logic of the application without digging through the code.

## Core Concepts

### Talents
Characters have three primary active abilities, referred to as "Talents", which can be upgraded using specific materials:
- **Normal Attack**: The character's basic string of attacks and charged attacks.
- **Elemental Skill**: A unique ability on a short cooldown that generates energy.
- **Elemental Burst**: The character's "Ultimate" ability. It requires energy to cast and generally has a longer cooldown.

### Ascension (✦)
Characters and Weapons have a maximum level of 90. However, their leveling process is gated by "Ascension Phases" (Caps at levels 20, 40, 50, 60, 70, and 80). Breaking past an ascension cap requires specific boss materials and regional specialties. 
- In the code, this is often represented as an `ascension` integer (0 through 6).
- An ascension spark symbol (`✦`, equivalent to `*`) represents an ascended cap. This indicator is **only** displayed when the character is currently at one of the cap levels `[20, 40, 50, 60, 70, 80]` AND is ascended past the minimum cap for that level. Intermediate levels (like 61, 65, etc.) and Level 90 are always shown without stars.

### Constellations (C1 - C6)
When a player acquires a duplicate of a character they already own, they unlock a "Constellation" level (up to a maximum of 6). These provide permanent passive buffs or mechanical changes.
- **C3 and C5 Rule**: In Genshin Impact, unlocking Constellation 3 (C3) and Constellation 5 (C5) **always** provides a free +3 Level Boost to either the Elemental Skill or the Elemental Burst (which one gets boosted at C3 vs C5 depends on the specific character, though the planner generally boosts Skill at C3 and Burst at C5 as a baseline rule).
- **Visual Presentation**: Constellation-boosted levels are dynamically displayed using a light blue sky color (`#38bdf8`) in all planning grids, modals, and planner cards.

---

## Application Logic: Current vs Desired State
The planner's primary function is calculating the delta (difference) between a player's **Current State** and their **Desired State**. 

1. **Current**: The player's existing character level, ascension phase, and talent levels.
2. **Desired**: The goal the player wants to reach.
3. **Calculation**: The planner calculates the exact quantity of Mora (gold), experience books, talent books, enemy drops, and boss materials required to bridge the gap between Current and Desired.

*(Note: When a character is C3 or higher, the planner must accurately reflect the +3 boosted talent levels so the material calculations remain mathematically correct.)*

---

## Character Planner Visual and Presentation Rules

To align with official game styles, specific presentation guidelines are enforced across planning cards:

### 1. Character Rarity & Branding
Character names are styled with dynamic rarity nameplate headers:
- **4★ (Four-Star) Characters**: Uses a rich, glowing purple gradient (`#7b6a99`).
- **5★ (Five-Star) Characters**: Uses a rich, glowing gold-brown gradient (`#8c6a4a`).

### 2. Levels & Talents Layout
Level transitions and talent progressions are presented in a generously spaced horizontal layout within cards:
- **Spread Values**: Formatted as `[Current]   ➔   [Desired]` (e.g. `60✦   ➔   90` or `1   ➔   10`).
- **Ascension Indicator**:
  * Ascended cap levels `[20, 40, 50, 60, 70, 80]` display a single `✦` star (e.g., `60✦` or `80✦`) on both the planner card and target input/upgrade screens.
  * Level 90 and intermediate levels (e.g., 61, 65) display without a star.

### 3. Material Requirements & Density Grid
Materials required for upgrading are arranged in a high-density, beautifully optimized compact grid:
- **Layout & Column Span**: Styled as a compact `50px` width grid displaying 5 or more columns per row. Numbers are positioned at the top of the cell, with the material artwork occupying the bottom.
- **Artwork Zoom**: Material icons are zoomed by `1.35x` (`transform: scale(1.35)`) and centered to crop out transparent margin empty space, highlighting rich in-game artwork.
- **Strict Sort Order**: To mimic in-game presentation, requirements are strictly sorted by category:
  1. Mora (Gold)
  2. Character EXP Materials (e.g., Hero's Wit)
  3. Ascension Gems (Sliver ➔ Fragment ➔ Chunk ➔ Gemstone)
  4. Local Specialties (Regional plants/minerals)
  5. Enemy Drops (Common drops sorted by tier)
  6. Boss Ascension drops
  7. Weekly Boss drops (Talent ascension)
  8. Crowns of Insight (Talent level 10)
- **Quantities Representation**:
  - **Standard Materials**: Displays as `[Owned] / [Needed]` (e.g., `12 / 3` or `0 / 10`).
  - **Mora & EXP Books**: On planner cards, these display as estimated required values prefixed by a tilde (e.g., `~1.2M` or `~415`). In the Upgrade Modal, they use inventory-aware clamping progress: `#Required / ~#Required` (e.g. `100 / ~100`) if sufficient, or `#EquivalentOwned / ~#Required` if not.
- **Satisfaction States**: When a player has enough of a material, the cell is automatically dimmed/darkened with a subtle translucent grayscale layer and scaled-down checkmark, removing distracting green highlight rings.

---

## Alchemical Material Crafting Chains

Talent Books and Common Drops are grouped into 3-tier alchemical crafting chains (Common ➔ Uncommon ➔ Rare).
* **Crafting Recipe Ratio**: $3$ units of a lower rarity units can be synthesized into $1$ unit of the next higher rarity.
* **Top-Down Propagation**: Missing counts at higher tiers are propagated recursively down as demands ($3 \times$ ingredients) to lower tiers to calculate the minimal alchemical path.
* **Bottom-Up Synthesis**: Execution uses bottom-up alchemical synthesis to craft exactly what is missing based on actual inventory.
* **Crafting Bonuses**: manual bonuses can be entered for double yields (e.g. Sucrose or Albedo talents) during alchemical simulation.

---

## EXP Book Equivalents

Character leveling requires experience books. There are three tiers of experience books, which can substitute for one another based on total equivalent experience points:
* **Experience Ratios**:
  * **Hero's Wit** = $20,000$ EXP
  * **Adventurer's Experience** = $5,000$ EXP
  * **Wanderer's Advice** = $1,000$ EXP
* **EXP Book Equivalence Rule**: If a player lacks the required number of Hero's Wits (e.g., `90` owned, `100` needed) but has enough total equivalent experience across all three tiers (e.g., including Adventurer's Experience or Wanderer's Advice), the Hero's Wit requirement is treated as **satisfied** (colored green).
* **Greedy Deduction Pattern**: During actual upgrades, deficit Hero's Wits are greedily covered by consuming Adventurer's Experience first, and Wanderer's Advice second.



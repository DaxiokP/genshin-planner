# Genshin Impact Domain Knowledge

This document serves as a reference for the core game mechanics and terminology used in the Genshin Planner. It is particularly useful for AI agents and new contributors to understand the business logic of the application without digging through the code.

## Core Concepts

### Talents
Characters have three primary active abilities, referred to as "Talents", which can be upgraded using specific materials:
- **Normal Attack**: The character's basic string of attacks and charged attacks.
- **Elemental Skill**: A unique ability on a short cooldown that generates energy.
- **Elemental Burst**: The character's "Ultimate" ability. It requires energy to cast and generally has a longer cooldown.

### Ascension (✦)
Characters and Weapons have a maximum level of 90. However, their leveling process is gated by "Ascension Phases" (Caps at levels 20, 40, 50, 60, 70, and 80). Breaking past an ascension cap requires specific materials (boss/specialty items for characters, domain/drop items for weapons). 
- In the code, this is often represented as an `ascension` integer (0 through 6).
- An ascension spark symbol (`✦`, equivalent to `*`) represents an ascended cap. This indicator is **only** displayed when the character/weapon is currently at one of the cap levels `[20, 40, 50, 60, 70, 80]` AND is ascended past the minimum cap for that level. Intermediate levels (like 61, 65, etc.) and Level 90 are always shown without stars.

### Constellations (C1 - C6) & Weapon Refinements (R1 - R5)
Duplicate units provide mechanical upgrades:
- **Character Constellations**: Unlocking Constellation 3 (C3) and Constellation 5 (C5) provides a free +3 Level Boost to either the Elemental Skill or the Elemental Burst (Skill is boosted at C3 and Burst at C5 as a baseline).
  - Constellation-boosted levels are dynamically displayed in a light blue sky color (`#38bdf8`) across modals and cards.
- **Weapon Refinements**: Duplicate weapons increment the Refinement level (up to R5).
  - In visual selection grids, refinement levels are displayed in a clean, gold-themed refinement badge overlay (`#ffcc66`) positioned in the top-left of the icon box.

---

## Application Logic: Current vs Desired State
The planner's primary function is calculating the delta (difference) between a player's **Current State** and their **Desired State**. 

1. **Current**: The player's existing level, ascension phase, and talent levels (for characters) or refinement/target (for weapons).
2. **Desired**: The goal level, ascension, and talent targets.
3. **Calculation**: The planner calculates the exact quantity of Mora, experience books (characters), enhancement ores (weapons), and ascension materials required to bridge the gap.

### Unique Planner Identity
- **Characters**: Characters are unique; duplicate plans are impossible. They are identified by their unique string key (e.g. `Furina`).
- **Weapons**: Players can own and plan multiple identical weapons (e.g., two `Favonius Lance` plans). Weapons are identified by their array index from the GOOD import (`weaponIndex`) and dynamic ID `weapon:${weaponIndex}` to remain independent.

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

Talent Books, Weapon Domain Materials, and Common Drops are grouped into 3-tier alchemical crafting chains (Common ➔ Uncommon ➔ Rare).
* **Crafting Recipe Ratio**: $3$ units of a lower rarity unit can be synthesized into $1$ unit of the next higher rarity.
* **Top-Down Propagation**: Missing counts at higher tiers are propagated recursively down as demands ($3 \times$ ingredients) to lower tiers to calculate the minimal alchemical path.
* **Bottom-Up Synthesis**: Execution uses bottom-up alchemical synthesis to craft exactly what is missing based on actual inventory.
* **Crafting Bonuses**: Manual bonuses can be entered for double yields (e.g. Sucrose double yields on monster drops or Dori refund chances) during alchemical simulation.

---

## EXP Book Equivalents

Character leveling requires experience books. There are three tiers of experience books, which can substitute for one another based on total equivalent experience points:
* **Experience Ratios**:
  * **Hero's Wit** = $20,000$ EXP
  * **Adventurer's Experience** = $5,000$ EXP
  * **Wanderer's Advice** = $1,000$ EXP
* **EXP Book Equivalence Rule**: If a player lacks the required number of Hero's Wits but has enough total equivalent experience across all three tiers, the Hero's Wit requirement is treated as **satisfied** (colored green).
* **Greedy Deduction Pattern**: During actual upgrades, deficit Hero's Wits are greedily covered by consuming Adventurer's Experience first, and Wanderer's Advice second.

---

## Enhancement Ore Equivalents

Weapon leveling requires enhancement ores. There are three tiers of enhancement ores, which can substitute for one another based on total equivalent weapon experience points:
* **Experience Ratios**:
  * **Mystic Enhancement Ore** = $10,000$ EXP
  * **Fine Enhancement Ore** = $2,000$ EXP
  * **Enhancement Ore** (Standard) = $400$ EXP
* **Ore Equivalence Rule**: If a player lacks the required number of Mystic Enhancement Ores but has enough total equivalent experience across all three ore tiers, the Mystic Enhancement Ore requirement is treated as **satisfied** (colored green).
* **Greedy Deduction Pattern**: Deficit Mystic Ores are greedily covered by consuming Fine Enhancement Ores first, and standard Enhancement Ores second, clamping base counts cleanly at `0`.



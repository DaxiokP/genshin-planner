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

### Constellations (C1 - C6)
When a player acquires a duplicate of a character they already own, they unlock a "Constellation" level (up to a maximum of 6). These provide permanent passive buffs or mechanical changes.
- **C3 and C5 Rule**: In Genshin Impact, unlocking Constellation 3 (C3) and Constellation 5 (C5) **always** provides a free +3 Level Boost to either the Elemental Skill or the Elemental Burst (which one gets boosted at C3 vs C5 depends on the specific character, though the planner generally boosts Skill at C3 and Burst at C5 as a baseline rule).

## Application Logic: Current vs Desired State
The planner's primary function is calculating the delta (difference) between a player's **Current State** and their **Desired State**. 

1. **Current**: The player's existing character level, ascension phase, and talent levels.
2. **Desired**: The goal the player wants to reach.
3. **Calculation**: The planner calculates the exact quantity of Mora (gold), experience books, talent books, enemy drops, and boss materials required to bridge the gap between Current and Desired.

*(Note: When a character is C3 or higher, the planner must accurately reflect the +3 boosted talent levels so the material calculations remain mathematically correct.)*

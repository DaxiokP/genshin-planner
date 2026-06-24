import { describe, test, expect } from 'vitest';
import { applyUpgradeInventoryMutations } from '../upgradeHelpers';

describe('upgradeHelpers', () => {
  describe('applyUpgradeInventoryMutations', () => {
    test('updates inventory with crafting bonuses when they are not fully consumed', () => {
      const plannedChar = {
        key: 'Tighnari',
        type: 'character',
        enabled: true,
        current: {
          level: 90,
          ascension: 6,
          talent: { auto: 1, skill: 1, burst: 1 }
        },
        desired: {
          level: 90,
          ascension: 6,
          talent: { auto: 1, skill: 6, burst: 6 }
        }
      };

      // Set up inventory. We need 42 Guide to Admonition.
      // We own 20 Philosophies, but they are NOT in the inventory object originally.
      const materials = {
        GuideToAdmonition: 0,
        TeachingsOfAdmonition: 0,
        mora: 10000000,
        heroswit: 1000
      };

      // Let's say we got 5 Philosophies of Admonition from crafting bonuses
      const craftingBonuses = {
        philosophiesofadmonition: 5
      };

      // Let's run the mutation.
      const updatedMaterials = applyUpgradeInventoryMutations(
        plannedChar,
        plannedChar.desired,
        materials,
        craftingBonuses,
        5000000,
        { heroswit: 800, adventurersexperience: 0, wanderersadvice: 0 }
      );

      console.log('updatedMaterials:', updatedMaterials);
      expect(updatedMaterials.PhilosophiesOfAdmonition).toBe(5);
    });

    test('reproduces user scenario: crafting bonuses do not reduce required crafts and are correctly added to final inventory', () => {
      const plannedChar = {
        key: 'Tighnari',
        type: 'character',
        enabled: true,
        current: {
          level: 70,
          ascension: 5,
          talent: { auto: 1, skill: 6, burst: 6 }
        },
        desired: {
          level: 70,
          ascension: 5,
          talent: { auto: 1, skill: 7, burst: 6 }
        }
      };

      // User inventory: 190 Fungal Spores (grey), 0 Luminescent Pollen (green), 0 Crystalline Cyst Dust (blue)
      const materials = {
        FungalSpores: 190,
        LuminescentPollen: 0,
        CrystallineCystDust: 0,
        GuideToAdmonition: 100,
        PhilosophiesOfAdmonition: 100,
        TheMeaningOfAeons: 100, // weekly boss drop for Tighnari
        mora: 10000000,
        heroswit: 1000
      };

      // User crafted 12 green and got 1 green bonus.
      // User crafted 4 blue and got 1 blue bonus.
      const craftingBonuses = {
        luminescentpollen: 1,
        crystallinecystdust: 1
      };

      const updatedMaterials = applyUpgradeInventoryMutations(
        plannedChar,
        plannedChar.desired,
        materials,
        craftingBonuses,
        10000000,
        { heroswit: 1000, adventurersexperience: 0, wanderersadvice: 0 }
      );

      console.log('User scenario updatedMaterials:', updatedMaterials);

      // We expect:
      // Grey (FungalSpores) count: 190 - 36 = 154
      expect(updatedMaterials.FungalSpores).toBe(154);
      // Green (LuminescentPollen) count: 0 + 12 (crafted) + 1 (bonus) - 12 (spent) = 1
      expect(updatedMaterials.LuminescentPollen).toBe(1);
      // Blue (CrystallineCystDust) count: 0 + 4 (crafted) + 1 (bonus) - 4 (spent) = 1
      expect(updatedMaterials.CrystallineCystDust).toBe(1);
    });
  });
});

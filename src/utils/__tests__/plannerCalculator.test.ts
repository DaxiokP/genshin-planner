import { describe, test, expect } from 'vitest';
import { calculateRequirements, simulatePlannerInventory } from '../plannerCalculator';

describe('plannerCalculator', () => {
  describe('calculateRequirements', () => {
    test('calculates correct level ascension and talent Mora/materials delta for a character', () => {
      const plannedChar = {
        key: 'Aether',
        type: 'character',
        enabled: true,
        current: {
          level: 1,
          ascension: 0,
          talent: { auto: 1, skill: 1, burst: 1 }
        },
        desired: {
          level: 20,
          ascension: 1,
          talent: { auto: 1, skill: 1, burst: 1 }
        }
      };

      // Empty inventory
      const requirements = calculateRequirements(plannedChar, {});
      
      const herosWitReq = requirements.find(r => r.key === 'heroswit');
      const moraReq = requirements.find(r => r.key === 'mora');

      expect(herosWitReq).toBeDefined();
      expect(herosWitReq!.required).toBeGreaterThan(0);
      expect(moraReq).toBeDefined();
      expect(moraReq!.required).toBeGreaterThan(0);

      // Verify that missing is equal to required since we own 0
      expect(herosWitReq!.missing).toBe(herosWitReq!.required);
      expect(moraReq!.missing).toBe(moraReq!.required);
    });

    test('validates Hero Wit EXP Equivalence rule', () => {
      const plannedChar = {
        key: 'Aether',
        type: 'character',
        enabled: true,
        current: { level: 80, ascension: 6, talent: { auto: 1, skill: 1, burst: 1 } },
        desired: { level: 90, ascension: 6, talent: { auto: 1, skill: 1, burst: 1 } }
      };

      // To go from 80 to 90, cumulative exp delta is getCumulativeExp(90) - getCumulativeExp(80)
      // which is 8,362,650 - 4,940,625 = 3,422,025 EXP.
      // In Hero's Wits (20k EXP each), this is ceil(3422025 / 20000) = 172 Wits required.
      // Let's simulate owning 0 Hero's Wits but owning enough Adventurer's Experience (5k each)
      // 172 * 20000 = 3,440,000 EXP required.
      // Let's own 700 Adventurer's Experience = 700 * 5000 = 3,500,000 EXP.
      const inventory = {
        heroswit: 0,
        adventurersexperience: 700,
        wanderersadvice: 0
      };

      const requirements = calculateRequirements(plannedChar, inventory);
      const herosWitReq = requirements.find(r => r.key === 'heroswit');

      expect(herosWitReq).toBeDefined();
      expect(herosWitReq!.required).toBe(172);
      expect(herosWitReq!.owned).toBe(0);
      expect(herosWitReq!.isEnough).toBe(true); // Exp equivalence makes it true!
      expect(herosWitReq!.missing).toBe(0);     // Missing is 0 because we have enough total exp
    });

    test('validates Weapon Mystic Ore Equivalence rule', () => {
      const plannedWeapon = {
        key: 'Dull Blade',
        type: 'weapon',
        enabled: true,
        current: { level: 1, ascension: 0 },
        desired: { level: 20, ascension: 0 }
      };

      const requirements = calculateRequirements(plannedWeapon, {
        mysticenhancementore: 0,
        fineenhancementore: 100, // plenty of fine enhancement ore
      });

      const oreReq = requirements.find(r => r.key === 'mysticenhancementore');
      expect(oreReq).toBeDefined();
      expect(oreReq!.isEnough).toBe(true);
      expect(oreReq!.missing).toBe(0);
    });

    test('validates Alchemical Crafting cascades for group 100 common drops', () => {
      const plannedChar = {
        key: 'Aether',
        type: 'character',
        enabled: true,
        current: {
          level: 1,
          ascension: 0,
          talent: { auto: 1, skill: 1, burst: 1 }
        },
        desired: {
          level: 80,
          ascension: 5,
          talent: { auto: 1, skill: 1, burst: 1 }
        }
      };

      // Under empty inventory, calculate requirements
      const rawReqs = calculateRequirements(plannedChar, {});
      const concentrateReq = rawReqs.find(r => r.key === 'slimeconcentrate');
      
      if (concentrateReq && concentrateReq.required > 0) {
        const requiredCount = concentrateReq.required;

        // Let's own 3 times the required count in slimesecretions (uncommon, rarity 2)
        // 3 secrets = 1 concentrate.
        const inventory = {
          slimesecretions: requiredCount * 3,
          slimecondensate: 0,
          slimeconcentrate: 0
        };

        const convertedReqs = calculateRequirements(plannedChar, inventory);
        const concentrateRes = convertedReqs.find(r => r.key === 'slimeconcentrate');

        expect(concentrateRes!.isEnough).toBe(true);
        expect(concentrateRes!.missing).toBe(0);
        expect(concentrateRes!.converted).toBe(requiredCount);
      }
    });
  });

  describe('simulatePlannerInventory', () => {
    test('sequentially allocates resources across planner cards in priority order', () => {
      const plannedItems = [
        {
          id: 'char:Aether',
          key: 'Aether',
          type: 'character',
          enabled: true,
          current: { level: 70, ascension: 4, talent: { auto: 1, skill: 1, burst: 1 } },
          desired: { level: 80, ascension: 5, talent: { auto: 1, skill: 1, burst: 1 } }
        },
        {
          id: 'char:Lumine',
          key: 'Aether', // Use same key 'Aether' to get same requirement patterns
          type: 'character',
          enabled: true,
          current: { level: 70, ascension: 4, talent: { auto: 1, skill: 1, burst: 1 } },
          desired: { level: 80, ascension: 5, talent: { auto: 1, skill: 1, burst: 1 } }
        }
      ];

      // Let's calculate raw requirements for one card so we know what they need
      const singleCardReqs = calculateRequirements(plannedItems[0], {});
      const importantMat = singleCardReqs.find(r => r.key !== 'mora' && r.key !== 'heroswit' && r.required > 0);

      if (importantMat) {
        const matKey = importantMat.key;
        const matNeededPerCard = importantMat.required;

        // Let's have exactly enough of this material for ONE card in inventory
        const inventory = {
          [matKey]: matNeededPerCard,
          mora: 10000000,
          heroswit: 1000
        };

        const simulation = simulatePlannerInventory(plannedItems, inventory);

        // Check Card 1 (higher priority) requirements in simulation
        const card1Reqs = simulation.requirements['char:Aether'];
        const card1Mat = card1Reqs.find(r => r.key === matKey);
        expect(card1Mat!.isEnough).toBe(true);
        expect(card1Mat!.missing).toBe(0);

        // Check Card 2 (lower priority) requirements in simulation
        const card2Reqs = simulation.requirements['char:Lumine'];
        const card2Mat = card2Reqs.find(r => r.key === matKey);
        expect(card2Mat!.isEnough).toBe(false);
        expect(card2Mat!.missing).toBe(matNeededPerCard);
      }
    });

    test('standby plans (enabled = false) are skipped in inventory allocation', () => {
      const plannedItems = [
        {
          id: 'char:Aether',
          key: 'Aether',
          type: 'character',
          enabled: false, // standby!
          current: { level: 70, ascension: 4, talent: { auto: 1, skill: 1, burst: 1 } },
          desired: { level: 80, ascension: 5, talent: { auto: 1, skill: 1, burst: 1 } }
        },
        {
          id: 'char:Lumine',
          key: 'Aether',
          type: 'character',
          enabled: true, // active!
          current: { level: 70, ascension: 4, talent: { auto: 1, skill: 1, burst: 1 } },
          desired: { level: 80, ascension: 5, talent: { auto: 1, skill: 1, burst: 1 } }
        }
      ];

      const singleCardReqs = calculateRequirements(plannedItems[1], {});
      const importantMat = singleCardReqs.find(r => r.key !== 'mora' && r.key !== 'heroswit' && r.required > 0);

      if (importantMat) {
        const matKey = importantMat.key;
        const matNeededPerCard = importantMat.required;

        // Let's have exactly enough of this material for ONE card in inventory
        const inventory = {
          [matKey]: matNeededPerCard,
          mora: 10000000,
          heroswit: 1000
        };

        const simulation = simulatePlannerInventory(plannedItems, inventory);

        // Card 1 is disabled so its requirements in simulation should be empty or skipped,
        // and it shouldn't consume resources
        const card1Reqs = simulation.requirements['char:Aether'];
        expect(card1Reqs).toEqual([]);

        // Card 2 is active, and because Card 1 is disabled, Card 2 gets the material!
        const card2Reqs = simulation.requirements['char:Lumine'];
        const card2Mat = card2Reqs.find(r => r.key === matKey);
        expect(card2Mat!.isEnough).toBe(true);
        expect(card2Mat!.missing).toBe(0);
      }
    });
  });
});

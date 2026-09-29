import { describe, test, expect } from 'vitest';
import { calculateRequirements, simulatePlannerInventory, getDomainMaterialWeekdayGroup } from '../plannerCalculator';

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

  describe('getDomainMaterialWeekdayGroup', () => {
    test('maps 7.0 talent domain materials to correct schedules', () => {
      expect(getDomainMaterialWeekdayGroup('teachingsofcharity', 500, 104365)).toBe('Monday/Thursday');
      expect(getDomainMaterialWeekdayGroup('guidetocharity', 500, 104365)).toBe('Monday/Thursday');
      expect(getDomainMaterialWeekdayGroup('philosophiesofcharity', 500, 104365)).toBe('Monday/Thursday');

      expect(getDomainMaterialWeekdayGroup('teachingsoffortitude', 500, 104368)).toBe('Tuesday/Friday');
      expect(getDomainMaterialWeekdayGroup('guidetofortitude', 500, 104368)).toBe('Tuesday/Friday');
      expect(getDomainMaterialWeekdayGroup('philosophiesoffortitude', 500, 104368)).toBe('Tuesday/Friday');

      expect(getDomainMaterialWeekdayGroup('teachingsofglory', 500, 104371)).toBe('Wednesday/Saturday');
      expect(getDomainMaterialWeekdayGroup('guidetoglory', 500, 104371)).toBe('Wednesday/Saturday');
      expect(getDomainMaterialWeekdayGroup('philosophiesofglory', 500, 104371)).toBe('Wednesday/Saturday');

      // Also resolves correctly when sortGroup and sortRank are omitted
      expect(getDomainMaterialWeekdayGroup('teachingsofcharity')).toBe('Monday/Thursday');
      expect(getDomainMaterialWeekdayGroup('teachingsoffortitude')).toBe('Tuesday/Friday');
      expect(getDomainMaterialWeekdayGroup('teachingsofglory')).toBe('Wednesday/Saturday');
    });

    test('maps 7.0 weapon domain materials to correct schedules', () => {
      expect(getDomainMaterialWeekdayGroup('riseofthepalestararmy', 600, 114085)).toBe('Monday/Thursday');
      expect(getDomainMaterialWeekdayGroup('triumphofthepalestararmy', 600, 114085)).toBe('Monday/Thursday');

      expect(getDomainMaterialWeekdayGroup('measuredpourofthecellaredspiritualnectar', 600, 114089)).toBe('Tuesday/Friday');
      expect(getDomainMaterialWeekdayGroup('revelryofthecellaredspiritualnectar', 600, 114089)).toBe('Tuesday/Friday');

      expect(getDomainMaterialWeekdayGroup('thefrostemperorsrevival', 600, 114093)).toBe('Wednesday/Saturday');
      expect(getDomainMaterialWeekdayGroup('thefrostemperorsfarewell', 600, 114093)).toBe('Wednesday/Saturday');
    });

    test('Alyosha requirements use Fortitude and map to Tuesday/Friday domain schedule', () => {
      const plannedAlyosha = {
        key: 'Alyosha',
        type: 'character',
        enabled: true,
        current: {
          level: 1,
          ascension: 0,
          talent: { auto: 1, skill: 1, burst: 1 }
        },
        desired: {
          level: 1,
          ascension: 0,
          talent: { auto: 2, skill: 1, burst: 1 }
        }
      };

      const result = simulatePlannerInventory([plannedAlyosha], {});
      const tueFriMissing = result.domainMissing['Tuesday/Friday'];
      expect(tueFriMissing.some(m => m.key === 'teachingsoffortitude')).toBe(true);
      const fortitudeItem = tueFriMissing.find(m => m.key === 'teachingsoffortitude');
      expect(fortitudeItem?.name).toBe('Teachings of Fortitude');
      expect(fortitudeItem?.iconId).toBe('104368');
    });

    test('Clash of Kings and Favonius Lance (both 4-star weapons) require the exact same Mora from 1 to 90', () => {
      const clashOfKings = {
        key: 'Clash of Kings',
        type: 'weapon',
        enabled: true,
        current: { level: 1, ascension: 0 },
        desired: { level: 90, ascension: 6 }
      };

      const favoniusLance = {
        key: 'Favonius Lance',
        type: 'weapon',
        enabled: true,
        current: { level: 1, ascension: 0 },
        desired: { level: 90, ascension: 6 }
      };

      const clashReqs = calculateRequirements(clashOfKings, {});
      const favReqs = calculateRequirements(favoniusLance, {});

      const clashMora = clashReqs.find(r => r.key === 'mora');
      const favMora = favReqs.find(r => r.key === 'mora');

      expect(clashMora).toBeDefined();
      expect(favMora).toBeDefined();
      // Total 4-star weapon 1->90 mora = 604,265 (exp) + 150,000 (ascension) = 754,265
      expect(clashMora!.required).toBe(754265);
      expect(favMora!.required).toBe(754265);
      expect(clashMora!.required).toBe(favMora!.required);
    });

    test('Whitelake Frostfeather and Staff of Homa (both 5-star weapons) require the exact same Mora from 1 to 90', () => {
      const swanlake = {
        key: 'Whitelake Frostfeather',
        type: 'weapon',
        enabled: true,
        current: { level: 1, ascension: 0 },
        desired: { level: 90, ascension: 6 }
      };

      const homa = {
        key: 'Staff of Homa',
        type: 'weapon',
        enabled: true,
        current: { level: 1, ascension: 0 },
        desired: { level: 90, ascension: 6 }
      };

      const swanlakeReqs = calculateRequirements(swanlake, {});
      const homaReqs = calculateRequirements(homa, {});

      const swanlakeMora = swanlakeReqs.find(r => r.key === 'mora');
      const homaMora = homaReqs.find(r => r.key === 'mora');

      expect(swanlakeMora).toBeDefined();
      expect(homaMora).toBeDefined();
      // Total 5-star weapon 1->90 mora = 906,445 (exp) + 225,000 (ascension) = 1,131,445
      expect(swanlakeMora!.required).toBe(1131445);
      expect(homaMora!.required).toBe(1131445);
      expect(swanlakeMora!.required).toBe(homaMora!.required);
    });

    test('Patched characters (Sandrone, Odette, Alyosha, Vesna, Vodyanitsa) include talent and ascension Mora', () => {
      const patchedChars = ['Sandrone', 'Odette', 'Alyosha', 'Vesna', 'Vodyanitsa'];

      patchedChars.forEach(charKey => {
        const plannedChar = {
          key: charKey,
          type: 'character',
          enabled: true,
          current: {
            level: 1,
            ascension: 0,
            talent: { auto: 1, skill: 1, burst: 1 }
          },
          desired: {
            level: 90,
            ascension: 6,
            talent: { auto: 10, skill: 10, burst: 10 }
          }
        };

        const reqs = calculateRequirements(plannedChar, {});
        const moraReq = reqs.find(r => r.key === 'mora');
        expect(moraReq).toBeDefined();
        // Character 1->90: 1,676,000 (Hero's Wit exp mora) + 420,000 (ascension mora) = 2,096,000
        // Talents 1/1/1 -> 10/10/10: 1,652,500 * 3 = 4,957,500
        // Total = 7,053,500
        expect(moraReq!.required).toBe(7053500);
      });
    });
  });
});


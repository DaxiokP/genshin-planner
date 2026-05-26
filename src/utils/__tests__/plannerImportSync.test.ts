import { describe, test, expect } from 'vitest';
import { syncPlannedItemsWithGoodImport } from '../plannerImportSync';

describe('plannerImportSync', () => {
  describe('syncPlannedItemsWithGoodImport', () => {
    test('updates character current stats and clamps desired levels upward', () => {
      const previousPlannedItems = [
        {
          key: 'RaidenShogun',
          type: 'character',
          enabled: true,
          current: {
            level: 20,
            ascension: 1,
            talent: { auto: 1, skill: 1, burst: 1 }
          },
          desired: {
            level: 80,
            ascension: 5,
            talent: { auto: 6, skill: 6, burst: 6 }
          }
        }
      ];

      // Imported stats are higher!
      const importedCharacters = [
        {
          key: 'RaidenShogun',
          level: 70,
          constellation: 0,
          ascension: 4,
          talent: { auto: 2, skill: 8, burst: 8 }
        }
      ];

      const synced = syncPlannedItemsWithGoodImport(previousPlannedItems, importedCharacters, [], []);

      expect(synced[0].current.level).toBe(70);
      expect(synced[0].current.ascension).toBe(4);
      expect(synced[0].current.talent.auto).toBe(2);
      expect(synced[0].current.talent.skill).toBe(8);
      expect(synced[0].current.talent.burst).toBe(8);

      // Desired values should be clamped up to at least current stats
      expect(synced[0].desired.level).toBe(80); // kept 80 since 80 > 70
      expect(synced[0].desired.ascension).toBe(5); // kept 5 since 5 > 4
      expect(synced[0].desired.talent.auto).toBe(6); // kept 6 since 6 > 2
      expect(synced[0].desired.talent.skill).toBe(8); // bumped to 8 since current is 8!
      expect(synced[0].desired.talent.burst).toBe(8); // bumped to 8 since current is 8!
    });

    test('reconciles multiple identical weapons independently preserving refinements/locations', () => {
      // Let's assume we have two planned Favonius Lances (duplicate weapons)
      // We set weaponIndex to out-of-bounds numbers to bypass the direct index matching
      // and force refinement/location fallback comparison.
      const previousPlannedItems = [
        {
          id: 'weapon:99',
          key: 'Favonius Lance',
          type: 'weapon',
          weaponIndex: 99,
          current: { level: 20, ascension: 1 },
          desired: { level: 90, ascension: 6 }
        },
        {
          id: 'weapon:98',
          key: 'Favonius Lance',
          type: 'weapon',
          weaponIndex: 98,
          current: { level: 1, ascension: 0 },
          desired: { level: 80, ascension: 5 }
        }
      ];

      const previousOwnedWeapons: any[] = [];
      previousOwnedWeapons[99] = { key: 'Favonius Lance', level: 20, ascension: 1, refinement: 5, location: 'RaidenShogun' };
      previousOwnedWeapons[98] = { key: 'Favonius Lance', level: 1, ascension: 0, refinement: 1, location: '' };

      // New imported weapons list: their indices have shifted
      const importedWeapons = [
        { key: 'Favonius Lance', level: 5, ascension: 0, refinement: 1, location: '' }, // index 0 (unequipped, level advanced slightly)
        { key: 'Favonius Lance', level: 50, ascension: 3, refinement: 5, location: 'RaidenShogun' } // index 1 (equipped, level advanced)
      ];

      const synced = syncPlannedItemsWithGoodImport(
        previousPlannedItems,
        [],
        importedWeapons,
        previousOwnedWeapons
      );

      // Card 1: should map to imported index 1 (matching refinement 5, location RaidenShogun)
      expect(synced[0].weaponIndex).toBe(1);
      expect(synced[0].id).toBe('weapon:1');
      expect(synced[0].current.level).toBe(50);
      expect(synced[0].current.ascension).toBe(3);

      // Card 2: should map to imported index 0 (matching refinement 1, location "")
      expect(synced[1].weaponIndex).toBe(0);
      expect(synced[1].id).toBe('weapon:0');
      expect(synced[1].current.level).toBe(5);
      expect(synced[1].current.ascension).toBe(0);
    });
  });
});

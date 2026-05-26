import type { GoodCharacter, GoodWeapon } from '../types';

const normalizeKey = (key: string) => {
  const k = key === 'Traveler' ? 'Aether' : key;
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Reconciles previous planned characters and weapons with the newly imported GOOD data.
 * Updates current status, adjusts/clamps desired goals upward if current level exceeds desired,
 * and maintains proper references to owned weapon array indices using duplicate ranking.
 */
export function syncPlannedItemsWithGoodImport(
  previousPlannedItems: any[],
  importedCharacters: GoodCharacter[],
  importedWeapons: GoodWeapon[],
  previousOwnedWeapons?: GoodWeapon[]
): any[] {
  const usedWeaponIndices = new Set<number>();

  return previousPlannedItems.map(item => {
    if (item.type === 'character' || !item.type) {
      // Sync character plan
      const normPlannedCharKey = normalizeKey(item.key);
      const matchedImportChar = importedCharacters.find(
        c => normalizeKey(c.key) === normPlannedCharKey
      );

      if (!matchedImportChar) {
        return item; // Keep as is if character is not found in import
      }

      const currentLevel = matchedImportChar.level;
      const currentAscension = matchedImportChar.ascension;
      const currentTalents = matchedImportChar.talent || { auto: 1, skill: 1, burst: 1 };

      const desiredLevel = Math.max(item.desired.level, currentLevel);
      const desiredAscension = Math.max(item.desired.ascension, currentAscension);

      const prevDesiredTalent = item.desired.talent || { auto: 1, skill: 1, burst: 1 };
      const desiredTalents = {
        auto: Math.max(prevDesiredTalent.auto, currentTalents.auto || 1),
        skill: Math.max(prevDesiredTalent.skill, currentTalents.skill || 1),
        burst: Math.max(prevDesiredTalent.burst, currentTalents.burst || 1)
      };

      return {
        ...item,
        current: {
          level: currentLevel,
          ascension: currentAscension,
          talent: {
            auto: currentTalents.auto || 1,
            skill: currentTalents.skill || 1,
            burst: currentTalents.burst || 1
          }
        },
        desired: {
          level: desiredLevel,
          ascension: desiredAscension,
          talent: desiredTalents
        }
      };
    } else if (item.type === 'weapon') {
      // Sync weapon plan
      const normPlannedWeaponKey = normalizeKey(item.key);

      // Find unmatched candidate weapons in imported list with the same key
      const candidates = importedWeapons
        .map((w, idx) => ({ w, idx }))
        .filter(c => normalizeKey(c.w.key) === normPlannedWeaponKey && !usedWeaponIndices.has(c.idx));

      if (candidates.length === 0) {
        // Fallback: Try any same-key weapon if all are already reserved
        const allSameKey = importedWeapons
          .map((w, idx) => ({ w, idx }))
          .filter(c => normalizeKey(c.w.key) === normPlannedWeaponKey);

        if (allSameKey.length === 0) {
          return item; // Keep unchanged if weapon is completely gone
        }

        const bestFallback = allSameKey[0];
        return syncWeaponDetails(item, bestFallback.w, bestFallback.idx);
      }

      const prevOwned = previousOwnedWeapons && item.weaponIndex >= 0 && item.weaponIndex < previousOwnedWeapons.length
        ? previousOwnedWeapons[item.weaponIndex]
        : null;

      let bestMatch: { w: GoodWeapon; idx: number } | null = null;

      // 1. First try to match the previous weaponIndex if key matches and is unmatched
      const prevIdxMatch = candidates.find(c => c.idx === item.weaponIndex);
      if (prevIdxMatch) {
        if (prevOwned && prevIdxMatch.w.refinement === prevOwned.refinement && prevIdxMatch.w.location === prevOwned.location) {
          bestMatch = prevIdxMatch;
        } else if (prevOwned && prevIdxMatch.w.refinement === prevOwned.refinement) {
          bestMatch = prevIdxMatch;
        } else {
          bestMatch = prevIdxMatch;
        }
      }

      // 2. Try same key + same refinement + same location
      if (!bestMatch && prevOwned) {
        const sameRefLoc = candidates.find(
          c => c.w.refinement === prevOwned.refinement && c.w.location === prevOwned.location
        );
        if (sameRefLoc) bestMatch = sameRefLoc;
      }

      // 3. Try same key + same refinement
      if (!bestMatch && prevOwned) {
        const sameRef = candidates.find(c => c.w.refinement === prevOwned.refinement);
        if (sameRef) bestMatch = sameRef;
      }

      // 4. Use the highest-progress same-key non-maxed copy
      const weaponProgress = (w: GoodWeapon) => w.level * 10 + w.ascension;
      const isMaxed = (w: GoodWeapon) => w.level >= 90 && w.ascension >= 6;

      if (!bestMatch) {
        const nonMaxedCandidates = candidates.filter(c => !isMaxed(c.w));
        if (nonMaxedCandidates.length > 0) {
          nonMaxedCandidates.sort((a, b) => weaponProgress(b.w) - weaponProgress(a.w));
          bestMatch = nonMaxedCandidates[0];
        }
      }

      // 5. Use the best maxed copy
      if (!bestMatch) {
        candidates.sort((a, b) => weaponProgress(b.w) - weaponProgress(a.w));
        bestMatch = candidates[0];
      }

      usedWeaponIndices.add(bestMatch.idx);

      return syncWeaponDetails(item, bestMatch.w, bestMatch.idx);
    }

    return item;
  });
}

function syncWeaponDetails(item: any, matchedWeapon: GoodWeapon, newIndex: number): any {
  const currentLevel = matchedWeapon.level;
  const currentAscension = matchedWeapon.ascension;

  const desiredLevel = Math.max(item.desired.level, currentLevel);
  const desiredAscension = Math.max(item.desired.ascension, currentAscension);

  return {
    ...item,
    weaponIndex: newIndex,
    id: `weapon:${newIndex}`,
    current: {
      level: currentLevel,
      ascension: currentAscension
    },
    desired: {
      level: desiredLevel,
      ascension: desiredAscension
    }
  };
}

import characterRequirementsMapData from '../maps/characterRequirementsMap.json';
import materialMapData from '../maps/materialMap.json';
import type { PlannedCharacter } from '../App';

const characterRequirementsMap = characterRequirementsMapData as Record<string, {
  ascension: Record<string, { key: string; name: string; count: number }[]>;
  talents: Record<string, { key: string; name: string; count: number }[]>;
}>;

const materialMap = materialMapData as Record<string, {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}>;

// Exact cumulative EXP needed to reach each level from level 1 in Genshin Impact.
// CUMULATIVE_EXP[level - 1] represents the cumulative experience at that level.
const CUMULATIVE_EXP = [
  0,       // Lv 1
  1000,    // Lv 2
  2325,    // Lv 3
  4025,    // Lv 4
  6175,    // Lv 5
  8800,    // Lv 6
  11950,   // Lv 7
  15675,   // Lv 8
  20025,   // Lv 9
  25025,   // Lv 10
  30725,   // Lv 11
  37175,   // Lv 12
  44400,   // Lv 13
  52450,   // Lv 14
  61375,   // Lv 15
  71200,   // Lv 16
  81950,   // Lv 17
  93675,   // Lv 18
  106400,  // Lv 19
  120175,  // Lv 20
  135025,  // Lv 21
  151000,  // Lv 22
  168125,  // Lv 23
  186450,  // Lv 24
  206025,  // Lv 25
  226875,  // Lv 26
  249050,  // Lv 27
  272575,  // Lv 28
  297500,  // Lv 29
  323850,  // Lv 30
  362200,  // Lv 31
  392850,  // Lv 32
  425100,  // Lv 33
  458975,  // Lv 34
  494525,  // Lv 35
  531775,  // Lv 36
  570750,  // Lv 37
  611500,  // Lv 38
  654075,  // Lv 39
  698500,  // Lv 40
  744800,  // Lv 41
  795425,  // Lv 42
  848125,  // Lv 43
  902950,  // Lv 44
  959925,  // Lv 45
  1019100, // Lv 46
  1080500, // Lv 47
  1144175, // Lv 48
  1210150, // Lv 49
  1277600, // Lv 50
  1348300, // Lv 51
  1425950, // Lv 52
  1506675, // Lv 53
  1590525, // Lv 54
  1677550, // Lv 55
  1767800, // Lv 56
  1861325, // Lv 57
  1958150, // Lv 58
  2058325, // Lv 59
  2161900, // Lv 60
  2232600, // Lv 61
  2341550, // Lv 62
  2453600, // Lv 63
  2568775, // Lv 64
  2687100, // Lv 65
  2808625, // Lv 66
  2933400, // Lv 67
  3061475, // Lv 68
  3192875, // Lv 69
  3327650, // Lv 70
  3465825, // Lv 71
  3614525, // Lv 72
  3766900, // Lv 73
  3923000, // Lv 74
  4082875, // Lv 75
  4246575, // Lv 76
  4414150, // Lv 77
  4585650, // Lv 78
  4761125, // Lv 79
  4940625, // Lv 80
  5124200, // Lv 81
  5328225, // Lv 82
  5536975, // Lv 83
  5750525, // Lv 84
  5968925, // Lv 85
  6192225, // Lv 86
  6420500, // Lv 87
  6653800, // Lv 88
  6892175, // Lv 89
  8362650  // Lv 90
];

function getCumulativeExp(level: number): number {
  if (level <= 1) return 0;
  if (level >= 90) return CUMULATIVE_EXP[89];
  return CUMULATIVE_EXP[level - 1] || 0;
}

export interface RequiredMaterial {
  key: string;
  name: string;
  required: number;
  owned: number;
  missing: number;
  rarity: number;
  iconId: string;
  sortGroup?: number;
  sortRank?: number;
  isEnough?: boolean;
  converted?: number;
}

/**
 * Calculates all material requirements (EXP books, Mora, Ascension items, and Talent costs)
 * for a planned character progression path.
 */
export function calculateRequirements(
  planned: PlannedCharacter,
  materials: Record<string, number> | null
): RequiredMaterial[] {
  // If plan is temporarily disabled, return no requirements so they aren't calculated/summed
  if (planned.enabled === false) {
    return [];
  }

  // Aggregate required counts by lowercase, normalized material keys
  const reqsAccumulator: Record<string, number> = {};

  const addMaterial = (key: string, count: number) => {
    const k = key.toLowerCase();
    reqsAccumulator[k] = (reqsAccumulator[k] || 0) + count;
  };

  // 1. Level & EXP Materials (Hero's Wit + Level-Up Mora)
  if (planned.desired.level > planned.current.level) {
    const expDelta = getCumulativeExp(planned.desired.level) - getCumulativeExp(planned.current.level);
    if (expDelta > 0) {
      // Equivalent whole Hero's Wits (rounded up)
      const witsNeeded = Math.ceil(expDelta / 20000);
      if (witsNeeded > 0) {
        addMaterial('heroswit', witsNeeded);
        // Level Mora cost: using Hero's Wits costs exactly 4000 Mora per book (equivalent to 1 Mora per 5 EXP gained)
        addMaterial('mora', witsNeeded * 4000);
      }
    }
  }

  // Handle character lookup from requirements database
  // Note: GOOD inventory maps traveler to Aether. We support Traveler, Aether, Lumine.
  const charKey = planned.key === 'Traveler' ? 'Aether' : planned.key;
  const charReqs = characterRequirementsMap[charKey];

  if (charReqs) {
    // 2. Ascension Requirements
    if (planned.desired.ascension > planned.current.ascension) {
      for (let asc = planned.current.ascension + 1; asc <= planned.desired.ascension; asc++) {
        const stepCosts = charReqs.ascension[asc] || [];
        stepCosts.forEach(item => {
          addMaterial(item.key, item.count);
        });
      }
    }

    // 3. Talent Requirements (auto, skill, burst)
    const talentKeys: ('auto' | 'skill' | 'burst')[] = ['auto', 'skill', 'burst'];
    talentKeys.forEach(tKey => {
      const curLvl = planned.current.talent[tKey];
      const desLvl = planned.desired.talent[tKey];
      if (desLvl > curLvl) {
        for (let lvl = curLvl + 1; lvl <= desLvl; lvl++) {
          const stepCosts = charReqs.talents[lvl] || [];
          stepCosts.forEach(item => {
            addMaterial(item.key, item.count);
          });
        }
      }
    });
  } else {
    console.warn(`calculateRequirements: Requirements map missing for ${planned.key}`);
  }

  // 4. Map, compare against GOOD materials inventory, and sort results
  const results: RequiredMaterial[] = [];

  Object.entries(reqsAccumulator).forEach(([key, required]) => {
    // Fetch info from materialMap
    const mapData = materialMap[key];
    const name = mapData?.name || key;
    const rarity = mapData?.rarity || 3;
    const iconId = mapData?.id || '202'; // default fallback to Mora icon ID

    // Retrieve owned count case-insensitively from GOOD inventory
    let owned = 0;
    if (materials) {
      for (const goodKey of Object.keys(materials)) {
        if (goodKey.toLowerCase() === key) {
          owned = materials[goodKey];
          break;
        }
      }
    }

    const missing = Math.max(0, required - owned);

    results.push({
      key,
      name,
      required,
      owned,
      missing,
      rarity,
      iconId,
      sortGroup: mapData?.sortGroup,
      sortRank: mapData?.sortRank
    });
  });

  // 4b. Apply material crafting up-conversion (alchemy) logic for groups 100, 400, 500
  const activeChains = new Set<string>();
  results.forEach(item => {
    if ((item.sortGroup === 100 || item.sortGroup === 400 || item.sortGroup === 500) && 
        item.sortGroup !== undefined && item.sortRank !== undefined) {
      activeChains.add(`${item.sortGroup}_${item.sortRank}`);
    }
  });

  if (activeChains.size > 0) {
    // Collect all materials from materialMap for each active chain
    const chainItemsMap: Record<string, { key: string; sortGroup: number; sortRank: number; rarity: number; owned: number; required: number; itemRef?: RequiredMaterial }[]> = {};

    activeChains.forEach(chainKey => {
      chainItemsMap[chainKey] = [];
    });

    // Populate with all possible materials in the materialMap matching the active chains
    Object.entries(materialMap).forEach(([key, mapData]) => {
      if (mapData.sortGroup !== undefined && mapData.sortRank !== undefined) {
        const chainKey = `${mapData.sortGroup}_${mapData.sortRank}`;
        if (activeChains.has(chainKey)) {
          // Check if this item is in the results
          const existing = results.find(r => r.key === key);
          
          let owned = 0;
          if (existing) {
            owned = existing.owned;
          } else if (materials) {
            // Retrieve owned count case-insensitively from GOOD inventory
            for (const goodKey of Object.keys(materials)) {
              if (goodKey.toLowerCase() === key) {
                owned = materials[goodKey];
                break;
              }
            }
          }

          chainItemsMap[chainKey].push({
            key,
            sortGroup: mapData.sortGroup,
            sortRank: mapData.sortRank,
            rarity: mapData.rarity,
            owned,
            required: existing ? existing.required : 0,
            itemRef: existing
          });
        }
      }
    });

    // Process each chain to cascade surplus
    Object.values(chainItemsMap).forEach(chain => {
      // Sort ascending by rarity
      chain.sort((a, b) => a.rarity - b.rarity);

      let surplus = 0;
      chain.forEach(cItem => {
        const converted = Math.floor(surplus / 3);
        const available = cItem.owned + converted;
        const isEnough = available >= cItem.required;
        const missing = isEnough ? 0 : cItem.required - available;
        surplus = isEnough ? (available - cItem.required) : 0;

        // If the item exists in the actual required results, update its fields
        if (cItem.itemRef) {
          cItem.itemRef.isEnough = isEnough;
          cItem.itemRef.missing = missing;
          cItem.itemRef.converted = converted;
        }
      });
    });
  }

  // Set isEnough for all results that were not handled by chains
  results.forEach(item => {
    if (item.isEnough === undefined) {
      if (item.key === 'heroswit') {
        const requiredExp = item.required * 20000;
        
        let ownedWit = item.owned;
        let ownedAdv = 0;
        let ownedAdvice = 0;
        
        if (materials) {
          for (const goodKey of Object.keys(materials)) {
            const gkLower = goodKey.toLowerCase();
            if (gkLower === 'adventurersexperience') {
              ownedAdv = materials[goodKey];
            } else if (gkLower === 'wanderersadvice') {
              ownedAdvice = materials[goodKey];
            }
          }
        }
        
        const totalExpOwned = ownedWit * 20000 + ownedAdv * 5000 + ownedAdvice * 1000;
        item.isEnough = totalExpOwned >= requiredExp;
        item.missing = item.isEnough ? 0 : Math.ceil((requiredExp - totalExpOwned) / 20000);
      } else {
        item.isEnough = item.owned >= item.required;
      }
    }
  });

  // 5. Sort materials: Hero's Wit first, Mora second. Then by custom category order, then rarity ascending, then sortRank, then name.
  return results.sort((a, b) => {
    const getCategoryWeight = (item: typeof a) => {
      if (item.key === 'heroswit') return 1;
      if (item.key === 'mora') return 2;
      if (item.sortGroup === 100) return 3;
      if (item.sortGroup === 700 && item.key !== 'crownofinsight') return 4;
      if (item.sortGroup === 300) return 5;
      if (item.sortGroup === 400) return 6;
      if (item.sortGroup === 500 && item.key !== 'crownofinsight') return 7;
      if (item.sortGroup === 200) return 8;
      if (item.key === 'crownofinsight') return 9;
      return 10;
    };

    const weightA = getCategoryWeight(a);
    const weightB = getCategoryWeight(b);

    if (weightA !== weightB) {
      return weightA - weightB;
    }

    // Inside the same category:
    // For common drops, gemstones, and talent books: sort by rarity ascending
    if (weightA === 3 || weightA === 4 || weightA === 7) {
      if (a.rarity !== b.rarity) {
        return a.rarity - b.rarity;
      }
    }

    const rankA = a.sortRank ?? 0;
    const rankB = b.sortRank ?? 0;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    return a.name.localeCompare(b.name);
  });
}

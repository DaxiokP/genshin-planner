import characterRequirementsMapData from '../maps/characterRequirementsMap.json';
import weaponRequirementsMapData from '../maps/weaponRequirementsMap.json';
import weaponExpMapData from '../maps/weaponExpMap.json';
import weaponMapData from '../maps/weaponMap.json';
import materialMapData from '../maps/materialMap.json';


const characterRequirementsMap = characterRequirementsMapData as Record<string, {
  ascension: Record<string, { key: string; name: string; count: number }[]>;
  talents: Record<string, { key: string; name: string; count: number }[]>;
}>;

const weaponRequirementsMap = weaponRequirementsMapData as Record<string, {
  ascension: Record<string, { key: string; name: string; count: number }[]>;
}>;

const weaponExpMap = weaponExpMapData as Record<string, number[]>;

const weaponMapRaw = weaponMapData as Record<string, any>;
const weaponIndex: Record<string, string> = {};
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });
const lookupWeapon = (key: string) => weaponMapRaw[weaponIndex[normalize(key)]] ?? null;

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

function getWeaponCumulativeExp(rarity: number, level: number): number {
  const expArray = weaponExpMap[String(rarity)] || weaponExpMap['4'];
  if (level <= 1) return 0;
  if (level >= 90) return expArray[89];
  return expArray[level - 1] || 0;
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

export function getChainTiers(key: string): string[] {
  if (!key) return [];
  if (key.startsWith('?')) {
    return [key, key, key, key];
  }
  const meta = materialMap[key];
  if (!meta || meta.sortGroup === undefined || meta.sortRank === undefined) {
    return [key, key, key, key];
  }
  const chain = Object.entries(materialMap)
    .filter(([_, val]) => val.sortGroup === meta.sortGroup && val.sortRank === meta.sortRank)
    .sort((a, b) => a[1].rarity - b[1].rarity)
    .map(([k]) => k);
  
  while (chain.length < 4) {
    chain.push(chain[chain.length - 1] || key);
  }
  return chain;
}

export function accumulatePlanRequirements(planned: any, addMaterial: (key: string, count: number) => void) {
  const isWeapon = planned.type === 'weapon';
  const isCustom = planned.custom || planned.key.startsWith('custom_');

  if (isWeapon) {
    let rarity = 4;
    if (isCustom) {
      rarity = planned.customRarity || 4;
    } else {
      const wInfo = lookupWeapon(planned.key);
      rarity = wInfo?.rarity || 4;
    }

    if (planned.desired.level > planned.current.level) {
      const expDelta = getWeaponCumulativeExp(rarity, planned.desired.level) - getWeaponCumulativeExp(rarity, planned.current.level);
      if (expDelta > 0) {
        const oresNeeded = Math.ceil(expDelta / 10000);
        if (oresNeeded > 0) {
          addMaterial('mysticenhancementore', oresNeeded);
          addMaterial('mora', Math.round(expDelta / 10));
        }
      }
    }

    if (isCustom) {
      const mats = planned.customMaterials || {};
      const commonTiers = getChainTiers(mats.common || '?_common');
      const uncommonTiers = getChainTiers(mats.uncommon || '?_uncommon');
      const domainTiers = getChainTiers(mats.domainMaterial || '?_domainmaterial');

      if (planned.desired.ascension > planned.current.ascension) {
        for (let asc = planned.current.ascension + 1; asc <= planned.desired.ascension; asc++) {
          if (rarity === 5) {
            if (asc === 1) {
              addMaterial('mora', 10000);
              addMaterial(domainTiers[0], 5);
              addMaterial(uncommonTiers[0], 5);
              addMaterial(commonTiers[0], 3);
            } else if (asc === 2) {
              addMaterial('mora', 20000);
              addMaterial(domainTiers[1], 5);
              addMaterial(uncommonTiers[0], 18);
              addMaterial(commonTiers[0], 12);
            } else if (asc === 3) {
              addMaterial('mora', 30000);
              addMaterial(domainTiers[1], 9);
              addMaterial(uncommonTiers[1], 9);
              addMaterial(commonTiers[1], 9);
            } else if (asc === 4) {
              addMaterial('mora', 45000);
              addMaterial(domainTiers[2], 5);
              addMaterial(uncommonTiers[1], 18);
              addMaterial(commonTiers[1], 14);
            } else if (asc === 5) {
              addMaterial('mora', 55000);
              addMaterial(domainTiers[2], 9);
              addMaterial(uncommonTiers[2], 14);
              addMaterial(commonTiers[2], 9);
            } else if (asc === 6) {
              addMaterial('mora', 70000);
              addMaterial(domainTiers[3], 6);
              addMaterial(uncommonTiers[2], 27);
              addMaterial(commonTiers[2], 18);
            }
          } else if (rarity === 4) {
            if (asc === 1) {
              addMaterial('mora', 5000);
              addMaterial(domainTiers[0], 3);
              addMaterial(uncommonTiers[0], 3);
              addMaterial(commonTiers[0], 2);
            } else if (asc === 2) {
              addMaterial('mora', 15000);
              addMaterial(domainTiers[1], 3);
              addMaterial(uncommonTiers[0], 12);
              addMaterial(commonTiers[0], 8);
            } else if (asc === 3) {
              addMaterial('mora', 20000);
              addMaterial(domainTiers[1], 6);
              addMaterial(uncommonTiers[1], 6);
              addMaterial(commonTiers[1], 6);
            } else if (asc === 4) {
              addMaterial('mora', 30000);
              addMaterial(domainTiers[2], 3);
              addMaterial(uncommonTiers[1], 12);
              addMaterial(commonTiers[1], 9);
            } else if (asc === 5) {
              addMaterial('mora', 35000);
              addMaterial(domainTiers[2], 6);
              addMaterial(uncommonTiers[2], 9);
              addMaterial(commonTiers[2], 6);
            } else if (asc === 6) {
              addMaterial('mora', 45000);
              addMaterial(domainTiers[3], 4);
              addMaterial(uncommonTiers[2], 18);
              addMaterial(commonTiers[2], 12);
            }
          } else {
            if (asc === 1) {
              addMaterial('mora', 5000);
              addMaterial(domainTiers[0], 2);
              addMaterial(uncommonTiers[0], 2);
              addMaterial(commonTiers[0], 1);
            } else if (asc === 2) {
              addMaterial('mora', 10000);
              addMaterial(domainTiers[1], 2);
              addMaterial(uncommonTiers[0], 8);
              addMaterial(commonTiers[0], 5);
            } else if (asc === 3) {
              addMaterial('mora', 15000);
              addMaterial(domainTiers[1], 4);
              addMaterial(uncommonTiers[1], 4);
              addMaterial(commonTiers[1], 4);
            } else if (asc === 4) {
              addMaterial('mora', 20000);
              addMaterial(domainTiers[2], 2);
              addMaterial(uncommonTiers[1], 8);
              addMaterial(commonTiers[1], 6);
            } else if (asc === 5) {
              addMaterial('mora', 25000);
              addMaterial(domainTiers[2], 4);
              addMaterial(uncommonTiers[2], 6);
              addMaterial(commonTiers[2], 4);
            } else if (asc === 6) {
              addMaterial('mora', 30000);
              addMaterial(domainTiers[3], 3);
              addMaterial(uncommonTiers[2], 12);
              addMaterial(commonTiers[2], 8);
            }
          }
        }
      }
    } else {
      const wInfo = lookupWeapon(planned.key);
      const weaponReqs = wInfo ? weaponRequirementsMap[wInfo.name] : weaponRequirementsMap[planned.key];
      if (weaponReqs && planned.desired.ascension > planned.current.ascension) {
        for (let asc = planned.current.ascension + 1; asc <= planned.desired.ascension; asc++) {
          const stepCosts = weaponReqs.ascension[String(asc)] || [];
          stepCosts.forEach(item => {
            addMaterial(item.key, item.count);
          });
        }
      }
    }
  } else {
    if (planned.desired.level > planned.current.level) {
      const expDelta = getCumulativeExp(planned.desired.level) - getCumulativeExp(planned.current.level);
      if (expDelta > 0) {
        const witsNeeded = Math.ceil(expDelta / 20000);
        if (witsNeeded > 0) {
          addMaterial('heroswit', witsNeeded);
          addMaterial('mora', witsNeeded * 4000);
        }
      }
    }

    if (isCustom) {
      const mats = planned.customMaterials || {};
      const commonTiers = getChainTiers(mats.common || '?_common');
      const specialty = mats.localSpecialty || '?_localspecialty';
      const boss = mats.bossMaterial || '?_bossmaterial';
      const gemTiers = getChainTiers(mats.elementalGem || '?_elementalgem');
      const bookTiers = getChainTiers(mats.talentBook || '?_talentbook');
      const weekly = mats.weeklyMaterial || '?_weeklymaterial';

      if (planned.desired.ascension > planned.current.ascension) {
        for (let asc = planned.current.ascension + 1; asc <= planned.desired.ascension; asc++) {
          if (asc === 1) {
            addMaterial('mora', 20000);
            addMaterial(gemTiers[0], 1);
            addMaterial(specialty, 3);
            addMaterial(commonTiers[0], 3);
          } else if (asc === 2) {
            addMaterial('mora', 40000);
            addMaterial(gemTiers[1], 3);
            addMaterial(boss, 2);
            addMaterial(specialty, 10);
            addMaterial(commonTiers[0], 15);
          } else if (asc === 3) {
            addMaterial('mora', 60000);
            addMaterial(gemTiers[1], 6);
            addMaterial(boss, 4);
            addMaterial(specialty, 20);
            addMaterial(commonTiers[1], 12);
          } else if (asc === 4) {
            addMaterial('mora', 80000);
            addMaterial(gemTiers[2], 3);
            addMaterial(boss, 8);
            addMaterial(specialty, 30);
            addMaterial(commonTiers[1], 18);
          } else if (asc === 5) {
            addMaterial('mora', 100000);
            addMaterial(gemTiers[2], 6);
            addMaterial(boss, 12);
            addMaterial(specialty, 45);
            addMaterial(commonTiers[2], 12);
          } else if (asc === 6) {
            addMaterial('mora', 120000);
            addMaterial(gemTiers[3], 6);
            addMaterial(boss, 20);
            addMaterial(specialty, 60);
            addMaterial(commonTiers[2], 24);
          }
        }
      }

      const talentKeys: ('auto' | 'skill' | 'burst')[] = ['auto', 'skill', 'burst'];
      talentKeys.forEach(tKey => {
        const curLvl = planned.current.talent[tKey];
        const desLvl = planned.desired.talent[tKey];
        if (desLvl > curLvl) {
          for (let lvl = curLvl + 1; lvl <= desLvl; lvl++) {
            if (lvl === 2) {
              addMaterial('mora', 12500);
              addMaterial(bookTiers[0], 3);
              addMaterial(commonTiers[0], 6);
            } else if (lvl === 3) {
              addMaterial('mora', 17500);
              addMaterial(bookTiers[1], 2);
              addMaterial(commonTiers[1], 3);
            } else if (lvl === 4) {
              addMaterial('mora', 25000);
              addMaterial(bookTiers[1], 4);
              addMaterial(commonTiers[1], 4);
            } else if (lvl === 5) {
              addMaterial('mora', 30000);
              addMaterial(bookTiers[1], 6);
              addMaterial(commonTiers[1], 6);
            } else if (lvl === 6) {
              addMaterial('mora', 37500);
              addMaterial(bookTiers[1], 9);
              addMaterial(commonTiers[1], 9);
            } else if (lvl === 7) {
              addMaterial('mora', 120000);
              addMaterial(bookTiers[2], 4);
              addMaterial(commonTiers[2], 4);
              addMaterial(weekly, 1);
            } else if (lvl === 8) {
              addMaterial('mora', 260000);
              addMaterial(bookTiers[2], 6);
              addMaterial(commonTiers[2], 6);
              addMaterial(weekly, 1);
            } else if (lvl === 9) {
              addMaterial('mora', 450000);
              addMaterial(bookTiers[2], 12);
              addMaterial(commonTiers[2], 9);
              addMaterial(weekly, 2);
            } else if (lvl === 10) {
              addMaterial('mora', 700000);
              addMaterial(bookTiers[2], 16);
              addMaterial(commonTiers[2], 12);
              addMaterial(weekly, 2);
              addMaterial('crownofinsight', 1);
            }
          }
        }
      });
    } else {
      const charKey = planned.key === 'Traveler' ? 'Aether' : planned.key;
      const charReqs = characterRequirementsMap[charKey];
      if (charReqs) {
        if (planned.desired.ascension > planned.current.ascension) {
          for (let asc = planned.current.ascension + 1; asc <= planned.desired.ascension; asc++) {
            const stepCosts = charReqs.ascension[asc] || [];
            stepCosts.forEach(item => {
              addMaterial(item.key, item.count);
            });
          }
        }

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
    }
  }
}

export function calculateRequirements(
  planned: any,
  materials: Record<string, number> | null
): RequiredMaterial[] {
  if (planned.enabled === false) {
    return [];
  }

  const reqsAccumulator: Record<string, number> = {};

  const addMaterial = (key: string, count: number) => {
    const k = key.toLowerCase();
    reqsAccumulator[k] = (reqsAccumulator[k] || 0) + count;
  };

  accumulatePlanRequirements(planned, addMaterial);

  const results: RequiredMaterial[] = [];

  Object.entries(reqsAccumulator).forEach(([key, required]) => {
    const mapData = materialMap[key];
    let name = mapData?.name || key;
    let rarity = mapData?.rarity || 3;
    let iconId = mapData?.id || '202';
    
    if (key.startsWith('?')) {
      if (key === '?_common') name = 'Common Drop';
      else if (key === '?_localspecialty') name = 'Local Specialty';
      else if (key === '?_bossmaterial') name = 'Boss Material';
      else if (key === '?_elementalgem') name = 'Elemental Gem';
      else if (key === '?_talentbook') name = 'Talent Book';
      else if (key === '?_weeklymaterial') name = 'Weekly Material';
      else if (key === '?_uncommon') name = 'Uncommon Drop';
      else if (key === '?_domainmaterial') name = 'Domain Material';
      rarity = 1;
      iconId = '?';
    }

    let owned = 0;
    if (materials && !key.startsWith('?')) {
      for (const goodKey of Object.keys(materials)) {
        if (goodKey.toLowerCase() === key) {
          owned = materials[goodKey];
          break;
        }
      }
    }

    const missing = key.startsWith('?') ? required : Math.max(0, required - owned);

    const matItem: RequiredMaterial = {
      key,
      name,
      required,
      owned,
      missing,
      rarity,
      iconId,
      sortGroup: mapData?.sortGroup,
      sortRank: mapData?.sortRank
    };

    if (key.startsWith('?')) {
      matItem.isEnough = false;
    }

    results.push(matItem);
  });

  // 4b. Apply material crafting up-conversion (alchemy) logic for groups 100, 400, 500, 600
  const activeChains = new Set<string>();
  results.forEach(item => {
    if ((item.sortGroup === 100 || item.sortGroup === 400 || item.sortGroup === 500 || item.sortGroup === 600) && 
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
      } else if (item.key === 'mysticenhancementore') {
        const requiredExp = item.required * 10000;
        
        let ownedMystic = item.owned;
        let ownedFine = 0;
        let ownedNormal = 0;
        
        if (materials) {
          for (const goodKey of Object.keys(materials)) {
            const gkLower = goodKey.toLowerCase();
            if (gkLower === 'fineenhancementore') {
              ownedFine = materials[goodKey];
            } else if (gkLower === 'enhancementore') {
              ownedNormal = materials[goodKey];
            }
          }
        }
        
        const totalExpOwned = ownedMystic * 10000 + ownedFine * 2000 + ownedNormal * 400;
        item.isEnough = totalExpOwned >= requiredExp;
        item.missing = item.isEnough ? 0 : Math.ceil((requiredExp - totalExpOwned) / 10000);
      } else {
        item.isEnough = item.owned >= item.required;
      }
    }
  });

  // 5. Sort materials: Mystic Ore, Hero's Wit first, Mora second. Then by custom category order, then sortRank (family) ascending, then rarity ascending, then name.
  return results.sort((a, b) => {
    const getCategoryWeight = (item: typeof a) => {
      if (item.key === 'mysticenhancementore') return 0.5;
      if (item.key === 'heroswit') return 1;
      if (item.key === 'mora') return 2;
      if (item.sortGroup === 600) return 2.5;
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

    const rankA = a.sortRank ?? 0;
    const rankB = b.sortRank ?? 0;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    if (a.rarity !== b.rarity) {
      return a.rarity - b.rarity;
    }

    return a.name.localeCompare(b.name);
  });
}

function consumeCharExp(amountNeeded: number, virtualInventory: Record<string, number>) {
  let remainingExp = amountNeeded;

  const books = [
    { key: 'wanderersadvice', exp: 1000 },
    { key: 'adventurersexperience', exp: 5000 },
    { key: 'heroswit', exp: 20000 }
  ];

  for (const book of books) {
    const ownedCount = virtualInventory[book.key] || 0;
    const expAvailable = ownedCount * book.exp;
    if (expAvailable <= remainingExp) {
      virtualInventory[book.key] = 0;
      remainingExp -= expAvailable;
    } else {
      const countToConsume = Math.ceil(remainingExp / book.exp);
      virtualInventory[book.key] = Math.max(0, ownedCount - countToConsume);
      remainingExp = 0;
      break;
    }
  }
}

function consumeWeaponExp(amountNeeded: number, virtualInventory: Record<string, number>) {
  let remainingExp = amountNeeded;

  const ores = [
    { key: 'enhancementore', exp: 400 },
    { key: 'fineenhancementore', exp: 2000 },
    { key: 'mysticenhancementore', exp: 10000 }
  ];

  for (const ore of ores) {
    const ownedCount = virtualInventory[ore.key] || 0;
    const expAvailable = ownedCount * ore.exp;
    if (expAvailable <= remainingExp) {
      virtualInventory[ore.key] = 0;
      remainingExp -= expAvailable;
    } else {
      const countToConsume = Math.ceil(remainingExp / ore.exp);
      virtualInventory[ore.key] = Math.max(0, ownedCount - countToConsume);
      remainingExp = 0;
      break;
    }
  }
}

export function getDomainMaterialWeekdayGroup(
  key: string,
  sortGroup?: number,
  sortRank?: number
): 'Monday/Thursday' | 'Tuesday/Friday' | 'Wednesday/Saturday' | null {
  if (sortGroup === 600 && sortRank !== undefined) {
    const mod = sortRank % 3;
    if (mod === 2) return 'Monday/Thursday';
    if (mod === 0) return 'Tuesday/Friday';
    if (mod === 1) return 'Wednesday/Saturday';
  }

  if (sortGroup === 500 && key !== 'crownofinsight') {
    const lowerKey = key.toLowerCase();
    const monThu = ['freedom', 'prosperity', 'transience', 'admonition', 'equity', 'contention', 'moonlight'];
    const tueFri = ['resistance', 'diligence', 'elegance', 'ingenuity', 'justice', 'kindling', 'elysium'];
    const wedSat = ['ballad', 'gold', 'light', 'praxis', 'order', 'conflict', 'vagrancy'];

    if (monThu.some(name => lowerKey.includes(name))) return 'Monday/Thursday';
    if (tueFri.some(name => lowerKey.includes(name))) return 'Tuesday/Friday';
    if (wedSat.some(name => lowerKey.includes(name))) return 'Wednesday/Saturday';
  }

  return null;
}

export function getRawCardRequirements(planned: any): Record<string, number> {
  const reqsAccumulator: Record<string, number> = {};

  const addMaterial = (key: string, count: number) => {
    const k = key.toLowerCase();
    reqsAccumulator[k] = (reqsAccumulator[k] || 0) + count;
  };

  accumulatePlanRequirements(planned, addMaterial);

  return reqsAccumulator;
}

export interface PlannerSimulationResult {
  requirements: Record<string, RequiredMaterial[]>;
  summaryMissing: RequiredMaterial[];
  domainMissing: Record<string, RequiredMaterial[]>;
}

export function simulatePlannerInventory(
  plannedItems: any[],
  materials: Record<string, number> | null
): PlannerSimulationResult {
  const virtualInventory: Record<string, number> = {};
  if (materials) {
    Object.entries(materials).forEach(([key, val]) => {
      virtualInventory[key.toLowerCase()] = val;
    });
  }

  // Pre-index alchemical chains
  const chains: Record<string, { key: string; sortGroup: number; sortRank: number; rarity: number }[]> = {};
  Object.entries(materialMap).forEach(([key, data]) => {
    if (data.sortGroup !== undefined && data.sortRank !== undefined && 
        (data.sortGroup === 100 || data.sortGroup === 400 || data.sortGroup === 500 || data.sortGroup === 600)) {
      const chainKey = `${data.sortGroup}_${data.sortRank}`;
      if (!chains[chainKey]) chains[chainKey] = [];
      chains[chainKey].push({
        key,
        sortGroup: data.sortGroup,
        sortRank: data.sortRank,
        rarity: data.rarity
      });
    }
  });

  Object.values(chains).forEach(chain => {
    chain.sort((a, b) => a.rarity - b.rarity);
  });

  const requirements: Record<string, RequiredMaterial[]> = {};

  plannedItems.forEach(planned => {
    const isWeapon = planned.type === 'weapon';
    const id = planned.id || (isWeapon ? `weapon:${planned.weaponIndex}` : `character:${planned.key}`);

    if (planned.enabled === false) {
      requirements[id] = [];
      return;
    }

    const cardReqs = getRawCardRequirements(planned);
    const cardResults: RequiredMaterial[] = [];
    const processedChainKeys = new Set<string>();

    const activeChains = new Set<string>();
    Object.keys(cardReqs).forEach(key => {
      const data = materialMap[key];
      if (data && data.sortGroup !== undefined && data.sortRank !== undefined && 
          (data.sortGroup === 100 || data.sortGroup === 400 || data.sortGroup === 500 || data.sortGroup === 600)) {
        activeChains.add(`${data.sortGroup}_${data.sortRank}`);
      }
    });

    activeChains.forEach(chainKey => {
      const chain = chains[chainKey];
      let surplus = 0;
      
      const forwardResults = chain.map(cItem => {
        processedChainKeys.add(cItem.key);
        const required = cardReqs[cItem.key] || 0;
        const owned = virtualInventory[cItem.key] || 0;
        const converted = Math.floor(surplus / 3);
        const available = owned + converted;
        const isEnough = available >= required;
        const missing = isEnough ? 0 : required - available;
        surplus = isEnough ? (available - required) : 0;
        
        return {
          key: cItem.key,
          owned,
          required,
          converted,
          isEnough,
          missing
        };
      });

      let neededFromBelow = 0;
      for (let k = chain.length - 1; k >= 0; k--) {
        const res = forwardResults[k];
        const totalNeeded = res.required + neededFromBelow;
        const consumed = Math.min(res.owned, totalNeeded);
        virtualInventory[res.key] = res.owned - consumed;
        const remainingNeeded = totalNeeded - consumed;
        neededFromBelow = Math.min(remainingNeeded, res.converted) * 3;
      }

      forwardResults.forEach(res => {
        if (res.required > 0) {
          const mapData = materialMap[res.key];
          const name = mapData?.name || res.key;
          const rarity = mapData?.rarity || 3;
          const iconId = mapData?.id || '202';
          
          cardResults.push({
            key: res.key,
            name,
            required: res.required,
            owned: res.owned,
            missing: res.missing,
            rarity,
            iconId,
            sortGroup: mapData?.sortGroup,
            sortRank: mapData?.sortRank,
            isEnough: res.isEnough,
            converted: res.converted
          });
        }
      });
    });

    Object.entries(cardReqs).forEach(([key, required]) => {
      if (processedChainKeys.has(key)) return;

      if (key === 'heroswit') {
        const requiredExp = required * 20000;
        const ownedWit = virtualInventory['heroswit'] || 0;
        const ownedAdv = virtualInventory['adventurersexperience'] || 0;
        const ownedAdvice = virtualInventory['wanderersadvice'] || 0;
        
        const totalExpOwned = ownedWit * 20000 + ownedAdv * 5000 + ownedAdvice * 1000;
        const isEnough = totalExpOwned >= requiredExp;
        const missing = isEnough ? 0 : Math.ceil((requiredExp - totalExpOwned) / 20000);
        
        const expToConsume = Math.min(totalExpOwned, requiredExp);
        consumeCharExp(expToConsume, virtualInventory);
        
        const mapData = materialMap[key];
        cardResults.push({
          key,
          name: mapData?.name || key,
          required,
          owned: isEnough ? required : Math.floor(totalExpOwned / 20000),
          missing,
          rarity: mapData?.rarity || 4,
          iconId: mapData?.id || 'heroswit',
          sortGroup: mapData?.sortGroup,
          sortRank: mapData?.sortRank,
          isEnough
        });
      } else if (key === 'mysticenhancementore') {
        const requiredExp = required * 10000;
        const ownedMystic = virtualInventory['mysticenhancementore'] || 0;
        const ownedFine = virtualInventory['fineenhancementore'] || 0;
        const ownedNormal = virtualInventory['enhancementore'] || 0;
        
        const totalExpOwned = ownedMystic * 10000 + ownedFine * 2000 + ownedNormal * 400;
        const isEnough = totalExpOwned >= requiredExp;
        const missing = isEnough ? 0 : Math.ceil((requiredExp - totalExpOwned) / 10000);
        
        const expToConsume = Math.min(totalExpOwned, requiredExp);
        consumeWeaponExp(expToConsume, virtualInventory);
        
        const mapData = materialMap[key];
        cardResults.push({
          key,
          name: mapData?.name || key,
          required,
          owned: isEnough ? required : Math.floor(totalExpOwned / 10000),
          missing,
          rarity: mapData?.rarity || 3,
          iconId: mapData?.id || 'mysticenhancementore',
          sortGroup: mapData?.sortGroup,
          sortRank: mapData?.sortRank,
          isEnough
        });
      } else {
        const owned = virtualInventory[key] || 0;
        const isEnough = owned >= required;
        const missing = isEnough ? 0 : required - owned;
        
        const consumed = Math.min(owned, required);
        virtualInventory[key] = owned - consumed;
        
        const mapData = materialMap[key];
        cardResults.push({
          key,
          name: mapData?.name || key,
          required,
          owned,
          missing,
          rarity: mapData?.rarity || 3,
          iconId: mapData?.id || '202',
          sortGroup: mapData?.sortGroup,
          sortRank: mapData?.sortRank,
          isEnough
        });
      }
    });

    requirements[id] = calculateRequirementsSort(cardResults);
  });

  // Consolidate overall missing materials
  const summaryAccumulator: Record<string, number> = {};
  Object.values(requirements).forEach(cardReqs => {
    cardReqs.forEach(req => {
      if (req.missing > 0) {
        summaryAccumulator[req.key] = (summaryAccumulator[req.key] || 0) + req.missing;
      }
    });
  });

  const summaryMissingList: RequiredMaterial[] = [];
  Object.entries(summaryAccumulator).forEach(([key, missing]) => {
    const mapData = materialMap[key];
    const name = mapData?.name || key;
    const rarity = mapData?.rarity || 3;
    const iconId = mapData?.id || '202';
    
    summaryMissingList.push({
      key,
      name,
      required: missing,
      owned: 0,
      missing,
      rarity,
      iconId,
      sortGroup: mapData?.sortGroup,
      sortRank: mapData?.sortRank,
      isEnough: false
    });
  });

  const summaryMissing = calculateRequirementsSort(summaryMissingList);

  // Group missing domain materials by weekday schedule
  const domainMissing: Record<string, RequiredMaterial[]> = {
    'Monday/Thursday': [],
    'Tuesday/Friday': [],
    'Wednesday/Saturday': []
  };

  summaryMissing.forEach(item => {
    const day = getDomainMaterialWeekdayGroup(item.key, item.sortGroup, item.sortRank);
    if (day) {
      domainMissing[day].push(item);
    }
  });

  return {
    requirements,
    summaryMissing,
    domainMissing
  };
}

function calculateRequirementsSort(results: RequiredMaterial[]): RequiredMaterial[] {
  return results.sort((a, b) => {
    const getCategoryWeight = (item: typeof a) => {
      if (item.key === 'mysticenhancementore') return 0.5;
      if (item.key === 'heroswit') return 1;
      if (item.key === 'mora') return 2;
      if (item.sortGroup === 600) return 2.5;
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

    const rankA = a.sortRank ?? 0;
    const rankB = b.sortRank ?? 0;
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    if (a.rarity !== b.rarity) {
      return a.rarity - b.rarity;
    }

    return a.name.localeCompare(b.name);
  });
}



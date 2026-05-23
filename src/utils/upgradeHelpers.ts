import materialMapData from '../maps/materialMap.json';
import { calculateRequirements } from './plannerCalculator';
import type { RequiredMaterial } from './plannerCalculator';
import type { PlannedCharacter } from '../App';

const materialMap = materialMapData as Record<string, {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}>;

export interface ChainItem {
  key: string;
  sortGroup: number;
  sortRank: number;
  rarity: number;
  name: string;
  id: string;
}

/**
 * Retrieves all items in the same craftable chain, sorted by rarity ascending.
 */
export function getChainItems(sortGroup: number, sortRank: number): ChainItem[] {
  const items: ChainItem[] = [];
  Object.entries(materialMap).forEach(([key, data]) => {
    if (data.sortGroup === sortGroup && data.sortRank === sortRank) {
      items.push({
        key,
        sortGroup,
        sortRank,
        rarity: data.rarity,
        name: data.name || key,
        id: data.id,
      });
    }
  });
  return items.sort((a, b) => a.rarity - b.rarity);
}

/**
 * Checks whether a material can receive crafting bonuses.
 * Crafting bonuses apply only to Talent materials (sortGroup === 500, excluding crown)
 * and Monster materials (sortGroup === 100) which are not the lowest rarity of their chain.
 */
export function canReceiveCraftingBonus(key: string): boolean {
  const lowerKey = key.toLowerCase();
  if (lowerKey === 'crownofinsight') return false;

  const data = materialMap[lowerKey];
  if (!data) return false;
  if (data.sortGroup !== 100 && data.sortGroup !== 500) return false;
  if (data.sortGroup === undefined || data.sortRank === undefined) return false;

  const chain = getChainItems(data.sortGroup, data.sortRank);
  if (chain.length <= 1) return false;

  const minRarity = Math.min(...chain.map(item => item.rarity));
  return data.rarity > minRarity;
}

/**
 * Greedily subtracts the required EXP (witsNeeded * 20,000) from EXP books inventory,
 * returning the leftover books.
 */
export function calculateRemainingExpBooks(
  requiredWitCount: number,
  ownedWit: number,
  ownedAdv: number,
  ownedAdvice: number
): {
  heroswit: number;
  adventurersexperience: number;
  wanderersadvice: number;
} {
  let expNeeded = requiredWitCount * 20000;

  // 1. Consume Hero's Wits (20k EXP each)
  let consumedWits = Math.min(ownedWit, Math.floor(expNeeded / 20000));
  expNeeded -= consumedWits * 20000;
  if (expNeeded > 0 && ownedWit > consumedWits) {
    consumedWits += 1;
    expNeeded = 0;
  }

  // 2. Consume Adventurer's Experience (5k EXP each)
  let consumedAdv = 0;
  if (expNeeded > 0) {
    consumedAdv = Math.min(ownedAdv, Math.floor(expNeeded / 5000));
    expNeeded -= consumedAdv * 5000;
    if (expNeeded > 0 && ownedAdv > consumedAdv) {
      consumedAdv += 1;
      expNeeded = 0;
    }
  }

  // 3. Consume Wanderer's Advice (1k EXP each)
  let consumedAdvice = 0;
  if (expNeeded > 0) {
    consumedAdvice = Math.min(ownedAdvice, Math.floor(expNeeded / 1000));
    expNeeded -= consumedAdvice * 1000;
    if (expNeeded > 0 && ownedAdvice > consumedAdvice) {
      consumedAdvice += 1;
      expNeeded = 0;
    }
  }

  return {
    heroswit: Math.max(0, ownedWit - consumedWits),
    adventurersexperience: Math.max(0, ownedAdv - consumedAdv),
    wanderersadvice: Math.max(0, ownedAdvice - consumedAdvice)
  };
}

/**
 * Top-down requirement propagation and bottom-up craft execution algorithm.
 * Strictly calculates only the 'enough' convert materials needed to reach the
 * missing numbers of materials. If it can't make enough, it shows the max it can convert.
 */
export function recalculateChainConversions(
  requirements: RequiredMaterial[],
  materials: Record<string, number> | null,
  craftingBonuses: Record<string, number>
): {
  recalculatedReqs: RequiredMaterial[];
  crafts: Record<string, number>;
  remainingCounts: Record<string, number>;
} {
  const getOwnedCount = (key: string): number => {
    if (!materials) return 0;
    const lower = key.toLowerCase();
    for (const gk of Object.keys(materials)) {
      if (gk.toLowerCase() === lower) {
        return materials[gk];
      }
    }
    return 0;
  };

  // Group by active craftable chain groups (100, 400, 500)
  const activeChainGroups = new Set<string>();
  requirements.forEach(req => {
    const data = materialMap[req.key];
    if (data && (data.sortGroup === 100 || data.sortGroup === 400 || data.sortGroup === 500) &&
        data.sortGroup !== undefined && data.sortRank !== undefined && req.key !== 'crownofinsight') {
      activeChainGroups.add(`${data.sortGroup}_${data.sortRank}`);
    }
  });

  const crafts: Record<string, number> = {};
  const remainingCounts: Record<string, number> = {};

  // Deep-ish copy of requirements to prevent side-effects
  const recalculatedReqs = requirements.map(r => ({ ...r }));
  const processedKeys = new Set<string>();

  activeChainGroups.forEach(chainKey => {
    const [sg, sr] = chainKey.split('_').map(Number);
    const chainItems = getChainItems(sg, sr); // Sorted ascending by rarity
    const n = chainItems.length;

    const chainData = chainItems.map(item => {
      processedKeys.add(item.key);
      const bonus = craftingBonuses[item.key] || 0;
      const owned = getOwnedCount(item.key) + bonus;
      const reqItem = recalculatedReqs.find(r => r.key === item.key);
      const required = reqItem?.required || 0;

      return {
        key: item.key,
        owned,
        required,
        missing: 0,
        converted: 0,
        isEnough: false,
        remaining: 0,
        reqItemRef: reqItem
      };
    });

    // Pass 1: Top-Down Requirement Propagation
    let additionalNeeded = 0;
    for (let i = n - 1; i >= 0; i--) {
      const cData = chainData[i];
      const totalNeeded = cData.required + additionalNeeded;
      cData.missing = Math.max(0, totalNeeded - cData.owned);
      additionalNeeded = 3 * cData.missing;
    }

    // Pass 2: Bottom-Up Craft Execution
    let surplusFromLower = 0;
    for (let i = 0; i < n; i++) {
      const cData = chainData[i];
      const available = cData.owned + surplusFromLower;
      cData.isEnough = available >= cData.required;

      const missing = cData.isEnough ? 0 : cData.required - available;
      const surplus = cData.isEnough ? (available - cData.required) : 0;

      const nextRequested = (i < n - 1) ? 3 * chainData[i + 1].missing : 0;
      const convertQty = Math.min(nextRequested, Math.floor(surplus / 3) * 3);

      cData.converted = surplusFromLower;
      cData.remaining = available - cData.required - convertQty;

      surplusFromLower = convertQty / 3;

      if (cData.reqItemRef) {
        cData.reqItemRef.isEnough = cData.isEnough;
        cData.reqItemRef.missing = missing;
        cData.reqItemRef.converted = cData.converted;
      }

      crafts[cData.key] = cData.converted;
      remainingCounts[cData.key] = cData.remaining;
    }
  });

  // Handle all other items not in any active chain group
  recalculatedReqs.forEach(req => {
    if (processedKeys.has(req.key)) return;

    const estimatedKeys = new Set(['mora', 'heroswit', 'adventurersexperience', 'wanderersadvice']);
    if (!estimatedKeys.has(req.key)) {
      const bonus = craftingBonuses[req.key] || 0;
      const owned = getOwnedCount(req.key) + bonus;
      req.isEnough = owned >= req.required;
      req.missing = Math.max(0, req.required - owned);
      req.converted = 0;
      remainingCounts[req.key] = Math.max(0, owned - req.required);
    }
  });

  // Recalculate EXP books sufficiency based on total EXP owned
  const herosWitReq = recalculatedReqs.find(r => r.key === 'heroswit');
  if (herosWitReq) {
    const requiredExp = herosWitReq.required * 20000;
    const ownedWit = getOwnedCount('heroswit');
    const ownedAdv = getOwnedCount('adventurersexperience');
    const ownedAdvice = getOwnedCount('wanderersadvice');

    const totalExpOwned = ownedWit * 20000 + ownedAdv * 5000 + ownedAdvice * 1000;
    const isEnough = totalExpOwned >= requiredExp;

    herosWitReq.isEnough = isEnough;
    herosWitReq.missing = isEnough ? 0 : Math.ceil((requiredExp - totalExpOwned) / 20000);

    // If enough, clamp owned count to display required/required (clamped).
    // Otherwise, show the equivalent Hero's Wits from total inventory EXP.
    herosWitReq.owned = isEnough ? herosWitReq.required : Math.floor(totalExpOwned / 20000);
  }

  return {
    recalculatedReqs,
    crafts,
    remainingCounts
  };
}

export interface SimulationResult {
  requirements: RequiredMaterial[];
  crafts: Record<string, number>;
  isSufficient: boolean;
  insufficientMaterials: string[];
}

/**
 * Simulates character upgrade targets, virtual crafting inputs, and sufficiency states.
 */
export function simulateUpgrade(
  planned: PlannedCharacter,
  target: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  },
  materials: Record<string, number> | null,
  craftingBonuses: Record<string, number>
): SimulationResult {
  // 1. Create draft planned character
  const draftPlanned: PlannedCharacter = {
    ...planned,
    desired: target,
  };

  // 2. Add crafting bonuses into virtual materials
  const virtualMaterials: Record<string, number> = {};
  if (materials) {
    Object.entries(materials).forEach(([k, val]) => {
      virtualMaterials[k] = val;
    });
  }

  Object.entries(craftingBonuses).forEach(([k, bonus]) => {
    if (bonus > 0) {
      const lowerKey = k.toLowerCase();
      let goodKey = k;
      if (materials) {
        const found = Object.keys(materials).find(gk => gk.toLowerCase() === lowerKey);
        if (found) goodKey = found;
      }
      virtualMaterials[goodKey] = (virtualMaterials[goodKey] || 0) + bonus;
    }
  });

  // 3. Compute raw requirements
  const rawRequirements = calculateRequirements(draftPlanned, virtualMaterials);

  // 4. Overwrite conversion math with recalculateChainConversions
  const { recalculatedReqs, crafts } = recalculateChainConversions(
    rawRequirements,
    virtualMaterials,
    {}
  );

  // 5. Evaluate sufficiency status
  const insufficientMaterials: string[] = [];
  const estimatedKeys = new Set(['mora', 'heroswit', 'adventurersexperience', 'wanderersadvice']);
  recalculatedReqs.forEach(mat => {
    if (!estimatedKeys.has(mat.key)) {
      if (!mat.isEnough) {
        insufficientMaterials.push(mat.name);
      }
    }
  });

  const isSufficient = insufficientMaterials.length === 0;

  return {
    requirements: recalculatedReqs,
    crafts,
    isSufficient,
    insufficientMaterials,
  };
}

/**
 * Persists the correct inventory mutations.
 */
export function applyUpgradeInventoryMutations(
  planned: PlannedCharacter,
  target: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  },
  materials: Record<string, number>,
  craftingBonuses: Record<string, number>,
  correctedMora: number,
  correctedExp: { heroswit: number; adventurersexperience: number; wanderersadvice: number }
): Record<string, number> {
  const nextMaterials = { ...materials };

  const setOwnedCount = (key: string, val: number) => {
    const lower = key.toLowerCase();
    const clamped = Math.max(0, val);
    for (const gk of Object.keys(nextMaterials)) {
      if (gk.toLowerCase() === lower) {
        nextMaterials[gk] = clamped;
        return;
      }
    }
    const stdName = materialMap[lower]?.name || key;
    nextMaterials[stdName] = clamped;
  };

  // 1. Gather raw required materials
  const draftPlanned = { ...planned, desired: target };
  const rawReqs = calculateRequirements(draftPlanned, materials);

  // 2. Perform recalculations
  const { remainingCounts } = recalculateChainConversions(
    rawReqs,
    materials,
    craftingBonuses
  );

  // 3. Update all counts
  Object.entries(remainingCounts).forEach(([key, remaining]) => {
    setOwnedCount(key, remaining);
  });

  // 4. Directly set corrected Mora and EXP counts
  setOwnedCount('mora', correctedMora);
  setOwnedCount('heroswit', correctedExp.heroswit);
  setOwnedCount('adventurersexperience', correctedExp.adventurersexperience);
  setOwnedCount('wanderersadvice', correctedExp.wanderersadvice);

  return nextMaterials;
}

/**
 * Checks if a level and ascension combination is an ascended cap level,
 * requiring a star/spark marker indicator. Level 90 is always excluded.
 */
export function hasSingleStar(level: number, ascension: number): boolean {
  if (level === 90) return false;
  const capAscensions: Record<number, number> = {
    20: 1,
    40: 2,
    50: 3,
    60: 4,
    70: 5,
    80: 6
  };
  const reqAsc = capAscensions[level];
  return reqAsc !== undefined && ascension >= reqAsc;
}


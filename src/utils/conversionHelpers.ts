import materialMapData from '../maps/materialMap.json';
import bossMappingsData from '../maps/bossMappings.json';
import type { MaterialsData } from '../types';

export interface MaterialMapItem {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}

const materialMap = materialMapData as Record<string, MaterialMapItem>;
const bossMappings = bossMappingsData as Record<
  string,
  {
    enemyName: string;
    drops: string[];
    gems: string[];
  }
>;

export const DUST_OF_AZOTH_KEY = 'dustofazoth';
export const DREAM_SOLVENT_KEY = 'dreamsolvent';

export type GemTier = 'gemstone' | 'chunk' | 'fragment' | 'sliver';

export const GEM_TIER_ORDER: readonly GemTier[] = [
  'gemstone',
  'chunk',
  'fragment',
  'sliver',
] as const;

export const GEM_TIER_LABELS: Record<GemTier, string> = {
  sliver: 'Sliver',
  fragment: 'Fragment',
  chunk: 'Chunk',
  gemstone: 'Gemstone',
};

/** Dust of Azoth cost per 1:1 elemental stone conversion. */
export const DUST_RATES: Record<GemTier, number> = {
  sliver: 1,
  fragment: 3,
  chunk: 9,
  gemstone: 27,
};

export const ELEMENTAL_GEM_FAMILIES = [
  { key: 'agnidusagate', name: 'Agnidus Agate', element: 'Pyro' },
  { key: 'varunadalazurite', name: 'Varunada Lazurite', element: 'Hydro' },
  { key: 'vayudaturquoise', name: 'Vayuda Turquoise', element: 'Anemo' },
  { key: 'vajradaamethyst', name: 'Vajrada Amethyst', element: 'Electro' },
  { key: 'nagadusemerald', name: 'Nagadus Emerald', element: 'Dendro' },
  { key: 'shivadajade', name: 'Shivada Jade', element: 'Cryo' },
  { key: 'prithivatopaz', name: 'Prithiva Topaz', element: 'Geo' },
] as const;

export type GemFamilyKey = (typeof ELEMENTAL_GEM_FAMILIES)[number]['key'];

export interface GemFamilyAndTier {
  family: GemFamilyKey;
  familyName: string;
  element: string;
  tier: GemTier;
}

/**
 * Resolves an elemental gemstone key to its family and tier.
 * Excludes Brilliant Diamond (Traveler ascension stones cannot be converted with Dust of Azoth).
 */
export function getGemFamilyAndTier(materialKey: string): GemFamilyAndTier | null {
  const lower = materialKey.toLowerCase();
  for (const fam of ELEMENTAL_GEM_FAMILIES) {
    if (lower.startsWith(fam.key)) {
      const suffix = lower.slice(fam.key.length) as GemTier;
      if ((GEM_TIER_ORDER as readonly string[]).includes(suffix)) {
        return {
          family: fam.key,
          familyName: fam.name,
          element: fam.element,
          tier: suffix,
        };
      }
    }
  }
  return null;
}

export function getGemKey(family: GemFamilyKey, tier: GemTier): string {
  return `${family}${tier}`;
}

export function getFamilyGemKeys(family: GemFamilyKey): string[] {
  return GEM_TIER_ORDER.map((tier) => getGemKey(family, tier));
}

export interface ConvertibleGemGroup {
  family: GemFamilyKey;
  familyName: string;
  element: string;
  keys: string[];
}

/**
 * Returns all convertible elemental stones from the 6 other elemental families.
 * When `filterTier` is set, only stones of that tier are returned; otherwise all 4 tiers per element.
 */
export function getConvertibleSourceGems(
  targetFamily: GemFamilyKey,
  filterTier?: GemTier | null
): ConvertibleGemGroup[] {
  return ELEMENTAL_GEM_FAMILIES.filter((fam) => fam.key !== targetFamily).map((fam) => ({
    family: fam.key,
    familyName: fam.name,
    element: fam.element,
    keys: filterTier ? [getGemKey(fam.key, filterTier)] : getFamilyGemKeys(fam.key),
  }));
}

export interface WeeklyBossConversionGroup {
  bossName: string;
  drops: string[];
}

/**
 * Resolves a weekly boss talent drop key to its weekly boss encounter and 3 drops.
 * Returns null for world bosses (sortGroup 300) or non-convertible special materials.
 */
export function getWeeklyBossConversionGroup(
  materialKey: string
): WeeklyBossConversionGroup | null {
  const lower = materialKey.toLowerCase();
  const entry = materialMap[lower];
  if (!entry || entry.sortGroup !== 200) return null;

  const bossInfo = bossMappings[lower];
  if (!bossInfo || !Array.isArray(bossInfo.drops) || bossInfo.drops.length < 2) {
    return null;
  }

  return {
    bossName: bossInfo.enemyName,
    drops: bossInfo.drops.map((d) => d.toLowerCase()),
  };
}

/**
 * Returns the remaining weekly boss drops from the same boss, excluding the target drop.
 */
export function getConvertibleSourceWeeklyDrops(
  drops: string[],
  targetKey: string
): string[] {
  const lowerTarget = targetKey.toLowerCase();
  return drops.filter((drop) => drop.toLowerCase() !== lowerTarget);
}

export function getOwnedMaterialCount(
  materials: MaterialsData | null | undefined,
  key: string
): number {
  if (!materials) return 0;
  const lower = key.toLowerCase();
  for (const gk of Object.keys(materials)) {
    if (gk.toLowerCase() === lower) {
      return materials[gk] ?? 0;
    }
  }
  return 0;
}

export interface ConversionCalculationInput {
  sourceKey: string | null;
  targetKey: string | null;
  sourceInventory: number;
  catalystInventory: number;
  convertAmount: number;
  catalystRatePerUnit: number;
}

export interface ConversionCalculationResult {
  sourceCost: number;
  catalystCost: number;
  insufficientSource: boolean;
  insufficientCatalyst: boolean;
  hasEnoughMaterials: boolean;
  canConvert: boolean;
}

export function calculateConversion(
  input: ConversionCalculationInput
): ConversionCalculationResult {
  const safeAmount = Number.isFinite(input.convertAmount)
    ? Math.max(0, Math.floor(input.convertAmount))
    : 0;
  const safeSourceInv = Number.isFinite(input.sourceInventory)
    ? Math.max(0, Math.floor(input.sourceInventory))
    : 0;
  const safeCatalystInv = Number.isFinite(input.catalystInventory)
    ? Math.max(0, Math.floor(input.catalystInventory))
    : 0;

  const sourceCost = safeAmount;
  const catalystCost = safeAmount * input.catalystRatePerUnit;

  const insufficientSource = safeAmount > 0 && sourceCost > safeSourceInv;
  const insufficientCatalyst = safeAmount > 0 && catalystCost > safeCatalystInv;
  const hasEnoughMaterials = !insufficientSource && !insufficientCatalyst;

  const hasValidPair =
    Boolean(input.sourceKey) &&
    Boolean(input.targetKey) &&
    input.sourceKey!.toLowerCase() !== input.targetKey!.toLowerCase();

  const canConvert = hasValidPair && safeAmount > 0 && hasEnoughMaterials;

  return {
    sourceCost,
    catalystCost,
    insufficientSource,
    insufficientCatalyst,
    hasEnoughMaterials,
    canConvert,
  };
}

export interface ApplyConversionParams {
  sourceKey: string;
  catalystKey: string;
  targetKey: string;
  sourceBaseInventory: number;
  catalystBaseInventory: number;
  targetBaseInventory: number;
  sourceCost: number;
  catalystCost: number;
  convertAmount: number;
}

function resolveExistingKey(
  baseMaterials: MaterialsData,
  targetKey: string
): string {
  const lower = targetKey.toLowerCase();
  for (const existingKey of Object.keys(baseMaterials)) {
    if (existingKey.toLowerCase() === lower) {
      return existingKey;
    }
  }
  return lower;
}

/**
 * Applies a completed conversion to the materials record while preserving existing GOOD key casing.
 */
export function applyConversionToMaterials(
  materials: MaterialsData | null | undefined,
  params: ApplyConversionParams
): MaterialsData {
  const baseMaterials = materials || {};
  const updated: MaterialsData = { ...baseMaterials };

  const sourceStorageKey = resolveExistingKey(baseMaterials, params.sourceKey);
  const catalystStorageKey = resolveExistingKey(baseMaterials, params.catalystKey);
  const targetStorageKey = resolveExistingKey(baseMaterials, params.targetKey);

  updated[sourceStorageKey] = Math.max(
    0,
    params.sourceBaseInventory - params.sourceCost
  );
  updated[catalystStorageKey] = Math.max(
    0,
    params.catalystBaseInventory - params.catalystCost
  );
  updated[targetStorageKey] = Math.max(
    0,
    params.targetBaseInventory + params.convertAmount
  );

  return updated;
}

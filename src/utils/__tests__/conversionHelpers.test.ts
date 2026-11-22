import { describe, it, expect } from 'vitest';
import {
  DUST_OF_AZOTH_KEY,
  DREAM_SOLVENT_KEY,
  DUST_RATES,
  getGemFamilyAndTier,
  getFamilyGemKeys,
  getConvertibleSourceGems,
  getWeeklyBossConversionGroup,
  getConvertibleSourceWeeklyDrops,
  calculateConversion,
  applyConversionToMaterials,
} from '../conversionHelpers';

describe('conversionHelpers', () => {
  describe('gem family & tier resolution', () => {
    it('resolves all 4 tiers of an elemental stone family', () => {
      expect(getGemFamilyAndTier('PrithivaTopazGemstone')).toEqual({
        family: 'prithivatopaz',
        familyName: 'Prithiva Topaz',
        element: 'Geo',
        tier: 'gemstone',
      });
      expect(getGemFamilyAndTier('shivadajadechunk')).toEqual({
        family: 'shivadajade',
        familyName: 'Shivada Jade',
        element: 'Cryo',
        tier: 'chunk',
      });
      expect(getGemFamilyAndTier('agnidusagatefragment')?.tier).toBe('fragment');
      expect(getGemFamilyAndTier('varunadalazuritesliver')?.tier).toBe('sliver');
    });

    it('excludes Brilliant Diamond from elemental conversion', () => {
      expect(getGemFamilyAndTier('brilliantdiamondgemstone')).toBeNull();
      expect(getGemFamilyAndTier('brilliantdiamondsliver')).toBeNull();
    });

    it('returns non-gem materials as null', () => {
      expect(getGemFamilyAndTier('mora')).toBeNull();
      expect(getGemFamilyAndTier('profanedsprout')).toBeNull();
    });

    it('returns the 4 gem keys ordered high to low rarity', () => {
      expect(getFamilyGemKeys('prithivatopaz')).toEqual([
        'prithivatopazgemstone',
        'prithivatopazchunk',
        'prithivatopazfragment',
        'prithivatopazsliver',
      ]);
    });

    it('returns all 6 other elemental families (24 stones) when no tier filter is set', () => {
      const groups = getConvertibleSourceGems('prithivatopaz', null);
      expect(groups).toHaveLength(6);
      expect(groups.some((g) => g.family === 'prithivatopaz')).toBe(false);
      expect(groups.every((g) => g.keys.length === 4)).toBe(true);
    });

    it('returns only matching tier from the 6 other elemental families when tier filter is set', () => {
      const groups = getConvertibleSourceGems('prithivatopaz', 'chunk');
      expect(groups).toHaveLength(6);
      expect(groups.every((g) => g.keys.length === 1 && g.keys[0].endsWith('chunk'))).toBe(true);
    });
  });

  describe('weekly boss conversion resolution', () => {
    it('resolves weekly boss drops to their 3-drop encounter group', () => {
      const group = getWeeklyBossConversionGroup('ProfanedSprout');
      expect(group).not.toBeNull();
      expect(group?.bossName).toBe('Il Dottore');
      expect(group?.drops).toEqual([
        'counterfeitresin',
        'twistedwitheredbranch',
        'profanedsprout',
      ]);
    });

    it('excludes the selected target from the selectable source weekly drops', () => {
      const sources = getConvertibleSourceWeeklyDrops(
        ['counterfeitresin', 'twistedwitheredbranch', 'profanedsprout'],
        'profanedsprout'
      );
      expect(sources).toEqual(['counterfeitresin', 'twistedwitheredbranch']);
    });

    it('returns null for world boss materials (sortGroup 300) and special non-boss items', () => {
      expect(getWeeklyBossConversionGroup('perpetualcaliber')).toBeNull();
      expect(getWeeklyBossConversionGroup('thecornerstoneofstarsandflames')).toBeNull();
    });
  });

  describe('conversion math & validation', () => {
    it('applies exact Dust of Azoth rates: 1 / 3 / 9 / 27', () => {
      expect(DUST_RATES).toEqual({
        sliver: 1,
        fragment: 3,
        chunk: 9,
        gemstone: 27,
      });

      const sliver = calculateConversion({
        sourceKey: 'shivadajadesliver',
        targetKey: 'prithivatopazsliver',
        sourceInventory: 100,
        catalystInventory: 100,
        convertAmount: 100,
        catalystRatePerUnit: DUST_RATES.sliver,
      });
      expect(sliver.sourceCost).toBe(100);
      expect(sliver.catalystCost).toBe(100);
      expect(sliver.canConvert).toBe(true);

      const chunk = calculateConversion({
        sourceKey: 'shivadajadechunk',
        targetKey: 'prithivatopazchunk',
        sourceInventory: 5,
        catalystInventory: 50,
        convertAmount: 3,
        catalystRatePerUnit: DUST_RATES.chunk,
      });
      expect(chunk.sourceCost).toBe(3);
      expect(chunk.catalystCost).toBe(27);
      expect(chunk.canConvert).toBe(true);

      const gemstone = calculateConversion({
        sourceKey: 'shivadajadegemstone',
        targetKey: 'prithivatopazgemstone',
        sourceInventory: 2,
        catalystInventory: 54,
        convertAmount: 2,
        catalystRatePerUnit: DUST_RATES.gemstone,
      });
      expect(gemstone.catalystCost).toBe(54);
      expect(gemstone.canConvert).toBe(true);
    });

    it('blocks conversion when source or catalyst inventory is insufficient', () => {
      const lowSource = calculateConversion({
        sourceKey: 'shivadajadefragment',
        targetKey: 'prithivatopazfragment',
        sourceInventory: 2,
        catalystInventory: 100,
        convertAmount: 5,
        catalystRatePerUnit: DUST_RATES.fragment,
      });
      expect(lowSource.insufficientSource).toBe(true);
      expect(lowSource.insufficientCatalyst).toBe(false);
      expect(lowSource.hasEnoughMaterials).toBe(false);
      expect(lowSource.canConvert).toBe(false);

      const lowDust = calculateConversion({
        sourceKey: 'shivadajadechunk',
        targetKey: 'prithivatopazchunk',
        sourceInventory: 10,
        catalystInventory: 10,
        convertAmount: 2,
        catalystRatePerUnit: DUST_RATES.chunk,
      });
      expect(lowDust.insufficientSource).toBe(false);
      expect(lowDust.insufficientCatalyst).toBe(true);
      expect(lowDust.hasEnoughMaterials).toBe(false);
      expect(lowDust.canConvert).toBe(false);
    });

    it('requires positive amount and distinct source/target', () => {
      const zero = calculateConversion({
        sourceKey: 'counterfeitresin',
        targetKey: 'profanedsprout',
        sourceInventory: 10,
        catalystInventory: 10,
        convertAmount: 0,
        catalystRatePerUnit: 1,
      });
      expect(zero.canConvert).toBe(false);
      expect(zero.hasEnoughMaterials).toBe(true);

      const same = calculateConversion({
        sourceKey: 'profanedsprout',
        targetKey: 'profanedsprout',
        sourceInventory: 10,
        catalystInventory: 10,
        convertAmount: 1,
        catalystRatePerUnit: 1,
      });
      expect(same.canConvert).toBe(false);
    });
  });

  describe('applyConversionToMaterials', () => {
    it('updates source, Dust of Azoth, and target while preserving GOOD key casing', () => {
      const initial = {
        ShivadaJadeChunk: 10,
        DustOfAzoth: 50,
        PrithivaTopazChunk: 2,
      };
      const updated = applyConversionToMaterials(initial, {
        sourceKey: 'shivadajadechunk',
        catalystKey: DUST_OF_AZOTH_KEY,
        targetKey: 'prithivatopazchunk',
        sourceBaseInventory: 10,
        catalystBaseInventory: 50,
        targetBaseInventory: 2,
        sourceCost: 3,
        catalystCost: 27,
        convertAmount: 3,
      });

      expect(updated).toEqual({
        ShivadaJadeChunk: 7,
        DustOfAzoth: 23,
        PrithivaTopazChunk: 5,
      });
    });

    it('handles Dream Solvent 1:1 weekly boss conversion and creates missing keys', () => {
      const initial = {
        CounterfeitResin: 6,
        DreamSolvent: 4,
      };
      const updated = applyConversionToMaterials(initial, {
        sourceKey: 'counterfeitresin',
        catalystKey: DREAM_SOLVENT_KEY,
        targetKey: 'profanedsprout',
        sourceBaseInventory: 6,
        catalystBaseInventory: 4,
        targetBaseInventory: 0,
        sourceCost: 2,
        catalystCost: 2,
        convertAmount: 2,
      });

      expect(updated).toEqual({
        CounterfeitResin: 4,
        DreamSolvent: 2,
        profanedsprout: 2,
      });
    });
  });
});

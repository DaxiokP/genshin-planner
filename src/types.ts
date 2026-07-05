export type MaterialsData = Record<string, number>;

export interface GoodCharacter {
  key: string;
  level: number;
  constellation: number;
  ascension: number;
  talent: {
    auto: number;
    skill: number;
    burst: number;
  };
}

export interface GoodWeapon {
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  location: string;
}

export interface GoodArtifact {
  setKey: string;
  slotKey: 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet';
  level: number;
  rarity: number;
  location: string;
}

export interface PlannedCharacter {
  key: string;
  current: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  };
  desired: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  };
  enabled?: boolean;
  type?: 'character' | 'weapon';
  id?: string;
  custom?: boolean;
  customName?: string;
  customRarity?: number;
  customWeaponType?: 'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst';
  customMaterials?: {
    common?: string;
    localSpecialty?: string;
    bossMaterial?: string;
    elementalGem?: string;
    talentBook?: string;
    weeklyMaterial?: string;
    uncommon?: string;
    domainMaterial?: string;
  };
  weaponIndex?: number;
}

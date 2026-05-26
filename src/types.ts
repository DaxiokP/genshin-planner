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
}

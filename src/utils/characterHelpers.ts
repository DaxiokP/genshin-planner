import characterMapData from '../maps/characterMap.json';

export type TravelerKey = 'Aether' | 'Lumine';
export type TravelerElement = 'Anemo' | 'Geo' | 'Electro' | 'Dendro' | 'Hydro' | 'Pyro' | 'Cryo';

export const TRAVELER_ELEMENTS: TravelerElement[] = [
  'Anemo',
  'Geo',
  'Electro',
  'Dendro',
  'Hydro',
  'Pyro',
  'Cryo',
];

const characterMapRaw: Record<string, any> = characterMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => {
  charIndex[normalize(k)] = k;
});

export const isTravelerKey = (key: string | null | undefined): boolean => {
  if (!key) return false;
  const n = normalize(key);
  return n === 'traveler' || n === 'aether' || n === 'lumine' || n.startsWith('traveler') || n.startsWith('aether') || n.startsWith('lumine');
};

export const isSameCharacterKey = (
  keyA: string | null | undefined,
  keyB: string | null | undefined
): boolean => {
  if (!keyA || !keyB) return false;
  if (isTravelerKey(keyA) && isTravelerKey(keyB)) return true;
  return normalize(keyA) === normalize(keyB);
};

export const extractTravelerElementFromString = (str: string | null | undefined): TravelerElement | null => {
  if (!str) return null;
  const lower = str.toLowerCase();
  for (const el of TRAVELER_ELEMENTS) {
    if (lower.includes(el.toLowerCase())) {
      return el;
    }
  }
  return null;
};

export const getTravelerElement = (plannedOrKey: any): TravelerElement => {
  if (!plannedOrKey) return 'Anemo';
  if (typeof plannedOrKey === 'string') {
    return extractTravelerElementFromString(plannedOrKey) || 'Anemo';
  }
  if (plannedOrKey.travelerElement && TRAVELER_ELEMENTS.includes(plannedOrKey.travelerElement)) {
    return plannedOrKey.travelerElement;
  }
  const fromId = extractTravelerElementFromString(plannedOrKey.id);
  if (fromId) return fromId;
  const fromKey = extractTravelerElementFromString(plannedOrKey.key);
  if (fromKey) return fromKey;
  return 'Anemo';
};

export const getCharacterPlanId = (
  plannedOrKey: any,
  traveler?: TravelerKey,
  explicitElement?: TravelerElement
): string => {
  if (!plannedOrKey) return '';
  if (typeof plannedOrKey === 'object') {
    if (plannedOrKey.type === 'weapon') {
      return plannedOrKey.id || `weapon:${plannedOrKey.weaponIndex}`;
    }
    const key = plannedOrKey.key;
    if (isTravelerKey(key)) {
      const resolvedKey = traveler || (normalize(key).startsWith('lumine') ? 'Lumine' : 'Aether');
      const el = explicitElement || getTravelerElement(plannedOrKey);
      return `character:${resolvedKey}:${el}`;
    }
    return plannedOrKey.id || `character:${key}`;
  }
  const keyStr = String(plannedOrKey);
  if (keyStr.startsWith('character:') || keyStr.startsWith('weapon:')) {
    return keyStr;
  }
  if (isTravelerKey(keyStr)) {
    const resolvedKey = traveler || (normalize(keyStr).startsWith('lumine') ? 'Lumine' : 'Aether');
    const el = explicitElement || extractTravelerElementFromString(keyStr) || 'Anemo';
    return `character:${resolvedKey}:${el}`;
  }
  return `character:${keyStr}`;
};

export const isSamePlannedCharacter = (
  planA: any,
  planB: any
): boolean => {
  if (!planA || !planB) return false;
  const keyA = typeof planA === 'string' ? planA : planA.key;
  const keyB = typeof planB === 'string' ? planB : planB.key;
  if (!isSameCharacterKey(keyA, keyB)) return false;
  if (isTravelerKey(keyA)) {
    return getTravelerElement(planA) === getTravelerElement(planB);
  }
  return true;
};

export const lookupCharacter = (
  key: string | null | undefined,
  traveler: TravelerKey = 'Aether'
) => {
  if (!key) return null;
  if (isTravelerKey(key)) {
    return characterMapRaw[traveler] ?? characterMapRaw['Aether'] ?? null;
  }
  const normalizedKey = normalize(key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};


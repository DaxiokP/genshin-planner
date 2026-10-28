import characterMapData from '../maps/characterMap.json';

export type TravelerKey = 'Aether' | 'Lumine';

const characterMapRaw: Record<string, any> = characterMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => {
  charIndex[normalize(k)] = k;
});

export const isTravelerKey = (key: string | null | undefined): boolean => {
  if (!key) return false;
  const n = normalize(key);
  return n === 'traveler' || n === 'aether' || n === 'lumine' || n.startsWith('traveler');
};

export const isSameCharacterKey = (
  keyA: string | null | undefined,
  keyB: string | null | undefined
): boolean => {
  if (!keyA || !keyB) return false;
  if (isTravelerKey(keyA) && isTravelerKey(keyB)) return true;
  return normalize(keyA) === normalize(keyB);
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


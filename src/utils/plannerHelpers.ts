/**
 * Helper utilities for planner reordering
 */

export function reorderByKeys<T extends { key: string; id?: string }>(items: T[], orderedKeys: string[]): T[] {
  const getId = (item: T) => item.id || item.key;
  const itemMap = new Map(items.map(item => [getId(item), item]));
  const ordered = orderedKeys
    .map(key => itemMap.get(key))
    .filter((item): item is T => !!item);
  
  // Append any items that weren't in orderedKeys just in case
  const orderedKeySet = new Set(orderedKeys);
  const remaining = items.filter(item => !orderedKeySet.has(getId(item)));
  return [...ordered, ...remaining];
}

export function moveItem<T extends { key: string; id?: string }>(
  items: T[],
  fromId: string,
  toId: string,
  placement: 'before' | 'after'
): T[] {
  if (fromId === toId) return items;
  
  const getId = (item: T) => item.id || item.key;
  
  const fromIndex = items.findIndex(item => getId(item) === fromId);
  if (fromIndex === -1) return items;
  
  const itemToMove = items[fromIndex];
  const remaining = items.filter(item => getId(item) !== fromId);
  
  const toIndexInRemaining = remaining.findIndex(item => getId(item) === toId);
  if (toIndexInRemaining === -1) return items;
  
  const insertIndex = placement === 'before' ? toIndexInRemaining : toIndexInRemaining + 1;
  
  const result = [...remaining];
  result.splice(insertIndex, 0, itemToMove);
  return result;
}

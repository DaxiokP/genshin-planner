/**
 * Helper utilities for planner reordering
 */

export function reorderByKeys<T extends { key: string }>(items: T[], orderedKeys: string[]): T[] {
  const itemMap = new Map(items.map(item => [item.key, item]));
  const ordered = orderedKeys
    .map(key => itemMap.get(key))
    .filter((item): item is T => !!item);
  
  // Append any items that weren't in orderedKeys just in case
  const orderedKeySet = new Set(orderedKeys);
  const remaining = items.filter(item => !orderedKeySet.has(item.key));
  return [...ordered, ...remaining];
}

export function moveItem<T extends { key: string }>(
  items: T[],
  fromKey: string,
  toKey: string,
  placement: 'before' | 'after'
): T[] {
  if (fromKey === toKey) return items;
  
  const fromIndex = items.findIndex(item => item.key === fromKey);
  if (fromIndex === -1) return items;
  
  const itemToMove = items[fromIndex];
  const remaining = items.filter(item => item.key !== fromKey);
  
  const toIndexInRemaining = remaining.findIndex(item => item.key === toKey);
  if (toIndexInRemaining === -1) return items;
  
  const insertIndex = placement === 'before' ? toIndexInRemaining : toIndexInRemaining + 1;
  
  const result = [...remaining];
  result.splice(insertIndex, 0, itemToMove);
  return result;
}

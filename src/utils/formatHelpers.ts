export const formatCompact = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 100000) {
    return (num / 1000).toFixed(0) + 'K';
  }
  if (num >= 1000) {
    const kValue = num / 1000;
    return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1).replace('.0', '') + 'K';
  }
  return num.toString();
};

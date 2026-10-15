// Normalize only for ordering; keep each catalog label unchanged.
const sizeOrder: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, SM: 3, M: 4, ML: 5, L: 6, LXL: 7,
  XL: 8, XXL: 9, '2XL': 9, XXXL: 10, '3XL': 10,
};
export function sortSizes(sizes: string[]): string[] {
  const key = (size: string) => size.toUpperCase().replace(/[\s/\-]/g, '');
  return [...sizes].sort((a, b) => {
    const rankA = sizeOrder[key(a)] ?? 100;
    const rankB = sizeOrder[key(b)] ?? 100;
    return rankA - rankB || a.localeCompare(b, 'es', { numeric: true });
  });
}

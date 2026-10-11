export function priceInColones(cop: number): number {
  if (!Number.isFinite(cop) || cop < 0) throw new Error("El precio debe ser un número positivo");
  return Math.round((cop / 3600) * 440 * 2 + 3500);
}
export const formatCRC = (value: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(value);

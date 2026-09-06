// Extraída de upsertFixture.ts para poder testearla sin Prisma: API-Football
// devuelve la posesión como string ("54%") y el resto de stats como number |
// null — este parseo es el punto donde más fácil es introducir un bug
// silencioso (ej. NaN en la respuesta si el proveedor cambia el formato).
export function pickStatValue(
  rows: { type: string; value: number | string | null }[],
  type: string,
): number | null {
  const found = rows.find((r) => r.type === type)?.value;
  if (typeof found === "string") {
    const parsed = Number(found.replace("%", ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return found ?? null;
}

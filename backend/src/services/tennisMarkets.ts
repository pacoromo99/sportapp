// Lógica pura de agregación de sets → mercados de tenis. Separada de la
// query a Prisma (routes/events.ts la llama) para poder testearla sin base
// de datos, igual que formCalculations.ts.

export type SetRow = { setNumber: number; homeGames: number; awayGames: number; wasTiebreak: boolean };

export function buildGamesMarket(sets: SetRow[]) {
  const totalGames = sets.reduce((sum, s) => sum + s.homeGames + s.awayGames, 0);
  const tiebreaks = sets.filter((s) => s.wasTiebreak).length;

  return {
    totalGamesPlayed: totalGames,
    setsPlayed: sets.length,
    tiebreaks,
    tiebreakRate: sets.length > 0 ? Number((tiebreaks / sets.length).toFixed(2)) : null,
  };
}

export function buildSetsMarket(sets: SetRow[]) {
  const homeSetsWon = sets.filter((s) => s.homeGames > s.awayGames).length;
  const awaySetsWon = sets.filter((s) => s.awayGames > s.homeGames).length;

  return {
    homeSetsWon,
    awaySetsWon,
    bySet: Object.fromEntries(sets.map((s) => [`set_${s.setNumber}`, `${s.homeGames}-${s.awayGames}`])),
  };
}

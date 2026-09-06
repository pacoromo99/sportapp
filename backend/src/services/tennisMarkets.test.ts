import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGamesMarket, buildSetsMarket, type SetRow } from "./tennisMarkets.js";

const sets: SetRow[] = [
  { setNumber: 1, homeGames: 6, awayGames: 4, wasTiebreak: false },
  { setNumber: 2, homeGames: 6, awayGames: 7, wasTiebreak: true },
  { setNumber: 3, homeGames: 6, awayGames: 2, wasTiebreak: false },
];

test("buildGamesMarket: suma juegos totales y detecta tie-breaks", () => {
  const result = buildGamesMarket(sets);
  assert.equal(result.totalGamesPlayed, 6 + 4 + 6 + 7 + 6 + 2);
  assert.equal(result.setsPlayed, 3);
  assert.equal(result.tiebreaks, 1);
  assert.equal(result.tiebreakRate, 0.33);
});

test("buildGamesMarket: sin sets todavía no rompe (partido recién empezado)", () => {
  const result = buildGamesMarket([]);
  assert.equal(result.totalGamesPlayed, 0);
  assert.equal(result.tiebreakRate, null);
});

test("buildSetsMarket: cuenta sets ganados por cada jugador, no solo el total de juegos", () => {
  const result = buildSetsMarket(sets);
  // home gana el set 1 (6-4) y el set 3 (6-2); away gana el set 2 (6-7)
  assert.equal(result.homeSetsWon, 2);
  assert.equal(result.awaySetsWon, 1);
  assert.deepEqual(result.bySet, { set_1: "6-4", set_2: "6-7", set_3: "6-2" });
});

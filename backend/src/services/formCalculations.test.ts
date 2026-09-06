import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateForm, calculateHeadToHead, type FinishedEvent } from "./formCalculations.js";

const events: FinishedEvent[] = [
  { id: "1", homeTeamId: "betis", awayTeamId: "sevilla", homeScore: 2, awayScore: 1 }, // betis gana, BTTS
  { id: "2", homeTeamId: "celta", awayTeamId: "betis", homeScore: 0, awayScore: 0 }, // empate, no BTTS
  { id: "3", homeTeamId: "betis", awayTeamId: "valencia", homeScore: 3, awayScore: 1 }, // betis gana, BTTS
];

test("calculateForm: agrega goles, BTTS y racha desde la perspectiva del equipo", () => {
  const result = calculateForm(events, "betis");

  assert.equal(result.matchesConsidered, 3);
  // (2 + 0 + 3) / 3
  assert.equal(result.avgGoalsFor, 1.67);
  // (1 + 0 + 1) / 3
  assert.equal(result.avgGoalsAgainst, 0.67);
  // 2 de 3 partidos con ambos marcando
  assert.equal(result.bttsRate, 0.67);
  // gana 2 de 3
  assert.equal(result.winRate, 0.67);
  assert.deepEqual(result.form, ["W", "D", "W"]);
});

test("calculateForm: sin partidos devuelve nulos, no NaN ni división por cero", () => {
  const result = calculateForm([], "betis");
  assert.equal(result.matchesConsidered, 0);
  assert.equal(result.avgGoalsFor, null);
  assert.deepEqual(result.form, []);
});

test("calculateForm: usa el marcador correcto según el equipo sea local o visitante", () => {
  // "betis" es visitante en el evento 2 (celta vs betis, 0-0) y en el 1 y 3 es local.
  const onlyAway: FinishedEvent[] = [
    { id: "2", homeTeamId: "celta", awayTeamId: "betis", homeScore: 1, awayScore: 3 },
  ];
  const result = calculateForm(onlyAway, "betis");
  assert.equal(result.avgGoalsFor, 3); // el gol de betis es awayScore, no homeScore
  assert.equal(result.avgGoalsAgainst, 1);
  assert.deepEqual(result.form, ["W"]);
});

test("calculateHeadToHead: cuenta victorias desde la perspectiva de teamId, no de local/visitante", () => {
  const h2h: FinishedEvent[] = [
    { id: "a", homeTeamId: "betis", awayTeamId: "celta", homeScore: 2, awayScore: 0 }, // betis gana
    { id: "b", homeTeamId: "celta", awayTeamId: "betis", homeScore: 1, awayScore: 1 }, // empate
    { id: "c", homeTeamId: "celta", awayTeamId: "betis", homeScore: 2, awayScore: 0 }, // celta gana
  ];

  const result = calculateHeadToHead(h2h, "betis");
  assert.equal(result.matchesConsidered, 3);
  assert.equal(result.teamWins, 1);
  assert.equal(result.draws, 1);
  assert.equal(result.otherWins, 1);
});

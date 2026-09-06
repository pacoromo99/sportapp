// Lógica pura (sin acceso a base de datos) de forma reciente y H2H, extraída
// de form.ts para poder testearla sin levantar Prisma/Postgres. Ver
// form.ts para las funciones que la alimentan con datos reales.

export type FinishedEvent = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type TeamFormResult = {
  matchesConsidered: number;
  avgGoalsFor: number | null;
  avgGoalsAgainst: number | null;
  bttsRate: number | null;
  winRate: number | null;
  form: ("W" | "D" | "L")[];
};

export function calculateForm(events: FinishedEvent[], teamId: string): TeamFormResult {
  if (events.length === 0) {
    return {
      matchesConsidered: 0,
      avgGoalsFor: null,
      avgGoalsAgainst: null,
      bttsRate: null,
      winRate: null,
      form: [],
    };
  }

  let goalsFor = 0;
  let goalsAgainst = 0;
  let btts = 0;
  let wins = 0;
  const form: ("W" | "D" | "L")[] = [];

  for (const e of events) {
    const isHome = e.homeTeamId === teamId;
    const gf = isHome ? e.homeScore : e.awayScore;
    const ga = isHome ? e.awayScore : e.homeScore;

    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > 0 && ga > 0) btts += 1;

    if (gf > ga) {
      wins += 1;
      form.push("W");
    } else if (gf === ga) {
      form.push("D");
    } else {
      form.push("L");
    }
  }

  const n = events.length;
  return {
    matchesConsidered: n,
    avgGoalsFor: Number((goalsFor / n).toFixed(2)),
    avgGoalsAgainst: Number((goalsAgainst / n).toFixed(2)),
    bttsRate: Number((btts / n).toFixed(2)),
    winRate: Number((wins / n).toFixed(2)),
    form,
  };
}

export type HeadToHeadResult = {
  matchesConsidered: number;
  teamWins: number;
  otherWins: number;
  draws: number;
};

export function calculateHeadToHead(events: FinishedEvent[], teamId: string): HeadToHeadResult {
  let teamWins = 0;
  let otherWins = 0;
  let draws = 0;

  for (const e of events) {
    const teamIsHome = e.homeTeamId === teamId;
    const teamScore = teamIsHome ? e.homeScore : e.awayScore;
    const otherScore = teamIsHome ? e.awayScore : e.homeScore;
    if (teamScore > otherScore) teamWins += 1;
    else if (teamScore < otherScore) otherWins += 1;
    else draws += 1;
  }

  return { matchesConsidered: events.length, teamWins, otherWins, draws };
}

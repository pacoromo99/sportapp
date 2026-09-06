import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const laliga = await prisma.competition.create({
    data: { name: "LaLiga", country: "España", sport: "football", season: "2026/27" },
  });

  const betis = await prisma.team.create({ data: { name: "Real Betis", country: "España", sport: "football" } });
  const celta = await prisma.team.create({ data: { name: "Celta de Vigo", country: "España", sport: "football" } });
  const sevilla = await prisma.team.create({ data: { name: "Sevilla FC", country: "España", sport: "football" } });
  const valencia = await prisma.team.create({ data: { name: "Valencia CF", country: "España", sport: "football" } });

  // Histórico finalizado — alimenta forma reciente y H2H (computeTeamForm / computeHeadToHead).
  const finished = [
    { home: betis, away: sevilla, hs: 2, as: 1, daysAgo: 21 },
    { home: celta, away: betis, hs: 0, as: 0, daysAgo: 14 },
    { home: betis, away: valencia, hs: 3, as: 1, daysAgo: 7 },
    { home: sevilla, away: celta, hs: 1, as: 1, daysAgo: 28 },
    { home: valencia, away: celta, hs: 2, as: 2, daysAgo: 10 },
  ];

  for (const m of finished) {
    await prisma.event.create({
      data: {
        competitionId: laliga.id,
        homeTeamId: m.home.id,
        awayTeamId: m.away.id,
        kickoff: daysAgo(m.daysAgo),
        status: "finished",
        homeScore: m.hs,
        awayScore: m.as,
        homeScoreHT: Math.min(m.hs, 1),
        awayScoreHT: Math.min(m.as, 1),
      },
    });
  }

  // Partido en vivo de ejemplo, con estadísticas y goles — lo que ve
  // MatchDetail al abrir la pantalla.
  const liveEvent = await prisma.event.create({
    data: {
      competitionId: laliga.id,
      homeTeamId: betis.id,
      awayTeamId: celta.id,
      kickoff: new Date(),
      status: "live",
      minute: 63,
      homeScore: 1,
      awayScore: 1,
      homeScoreHT: 1,
      awayScoreHT: 0,
    },
  });

  await prisma.footballEventStats.create({
    data: {
      eventId: liveEvent.id,
      homePossession: 54,
      awayPossession: 46,
      homeXg: 1.42,
      awayXg: 0.88,
      homeShotsOnGoal: 5,
      awayShotsOnGoal: 3,
      homeCorners: 6,
      awayCorners: 2,
      homeYellowCards: 2,
      awayYellowCards: 3,
      homeRedCards: 0,
      awayRedCards: 0,
      referee: "Referee ejemplo (media 4.8 tarjetas/partido)",
    },
  });

  await prisma.goal.createMany({
    data: [
      { eventId: liveEvent.id, teamId: betis.id, minute: 34, player: "Isco", type: "open_play" },
      { eventId: liveEvent.id, teamId: celta.id, minute: 58, player: "Iago Aspas", type: "penalty" },
    ],
  });

  await prisma.alert.createMany({
    data: [
      { eventId: liveEvent.id, market: "goalscorer", message: "⚽ Gol de Isco (Real Betis), min. 34'" },
      { eventId: liveEvent.id, market: "cards", message: "🟨 Tercera amarilla del partido para Celta de Vigo" },
    ],
  });

  // ---------- Segundo deporte: tenis (Fase 2) ----------
  // Demuestra que el núcleo canónico no cambia: Team es aquí un jugador,
  // homeScore/awayScore son sets ganados, y computeTeamForm/computeHeadToHead
  // se reutilizan tal cual (ver docs/market-mapping.md).
  const atp = await prisma.competition.create({
    data: { name: "ATP 500 Barcelona", country: "España", sport: "tennis", season: "2026" },
  });

  const playerA = await prisma.team.create({ data: { name: "A. Ruiz", country: "España", sport: "tennis", ranking: 12 } });
  const playerB = await prisma.team.create({ data: { name: "P. Costa", country: "Portugal", sport: "tennis", ranking: 27 } });

  await prisma.event.create({
    data: {
      competitionId: atp.id,
      homeTeamId: playerA.id,
      awayTeamId: playerB.id,
      kickoff: daysAgo(5),
      status: "finished",
      homeScore: 2, // sets ganados, no games
      awayScore: 1,
      surface: "clay",
    },
  });

  const liveTennisEvent = await prisma.event.create({
    data: {
      competitionId: atp.id,
      homeTeamId: playerA.id,
      awayTeamId: playerB.id,
      kickoff: new Date(),
      status: "live",
      homeScore: 1,
      awayScore: 0,
      surface: "clay",
    },
  });

  await prisma.tennisSet.createMany({
    data: [
      { eventId: liveTennisEvent.id, setNumber: 1, homeGames: 7, awayGames: 6, wasTiebreak: true },
      { eventId: liveTennisEvent.id, setNumber: 2, homeGames: 3, awayGames: 2, wasTiebreak: false }, // set 2 en curso
    ],
  });

  await prisma.tennisEventStats.create({
    data: {
      eventId: liveTennisEvent.id,
      homeAces: 8,
      awayAces: 4,
      homeDoubleFaults: 1,
      awayDoubleFaults: 3,
      homeFirstServeInPct: 68,
      awayFirstServeInPct: 59,
      homeBreakPointsWon: 2,
      homeBreakPointsTotal: 4,
      awayBreakPointsWon: 1,
      awayBreakPointsTotal: 5,
    },
  });

  await prisma.alert.create({
    data: {
      eventId: liveTennisEvent.id,
      market: "match_winner",
      message: "🎾 A. Ruiz se lleva el primer set en el tie-break (7-6)",
    },
  });

  console.log("Seed OK. Live football event id:", liveEvent.id, "— live tennis event id:", liveTennisEvent.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

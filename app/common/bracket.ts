import type { TeamScheduleMatch, TeamRanking } from "~/types/TeamSchedule.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BracketSlot {
  match: number;
  label: string;
  region: "upper" | "lower" | "finals";
  round: number; // column index (0-based)
  row: number; // row index within region
  redSource: MatchSource;
  blueSource: MatchSource;
}

type MatchSource =
  | { type: "seed"; seed: number }
  | { type: "winner"; match: number }
  | { type: "loser"; match: number };

export interface Alliance {
  seed: number;
  teams: number[];
  captain: number | null;
  eliminated: boolean;
  isOwner: boolean;
}

export interface ResolvedMatch {
  slot: BracketSlot;
  redSeed: number | null;
  blueSeed: number | null;
  redTeams: number[];
  blueTeams: number[];
  redScore: number | null;
  blueScore: number | null;
  winner: "red" | "blue" | null; // null = not yet played
  matchData: TeamScheduleMatch | null;
}

// ---------------------------------------------------------------------------
// Bracket topology for 8 alliances
// ---------------------------------------------------------------------------

// Seed pairings for first-round matches
const SEED_BY_MATCH: Record<number, [number, number]> = {
  1: [1, 8],
  2: [4, 5],
  3: [2, 7],
  4: [3, 6],
};

export const BRACKET_8: BracketSlot[] = [
  // Upper Bracket Round 1
  { match: 1, label: "M1", region: "upper", round: 0, row: 0,
    redSource: { type: "seed", seed: 1 }, blueSource: { type: "seed", seed: 8 } },
  { match: 2, label: "M2", region: "upper", round: 0, row: 1,
    redSource: { type: "seed", seed: 4 }, blueSource: { type: "seed", seed: 5 } },
  { match: 3, label: "M3", region: "upper", round: 0, row: 2,
    redSource: { type: "seed", seed: 2 }, blueSource: { type: "seed", seed: 7 } },
  { match: 4, label: "M4", region: "upper", round: 0, row: 3,
    redSource: { type: "seed", seed: 3 }, blueSource: { type: "seed", seed: 6 } },

  // Upper Bracket Semifinals
  { match: 7, label: "M7", region: "upper", round: 1, row: 0,
    redSource: { type: "winner", match: 1 }, blueSource: { type: "winner", match: 2 } },
  { match: 8, label: "M8", region: "upper", round: 1, row: 1,
    redSource: { type: "winner", match: 3 }, blueSource: { type: "winner", match: 4 } },

  // Upper Bracket Final
  { match: 11, label: "M11", region: "upper", round: 2, row: 0,
    redSource: { type: "winner", match: 7 }, blueSource: { type: "winner", match: 8 } },

  // Lower Bracket Round 1
  { match: 5, label: "M5", region: "lower", round: 0, row: 0,
    redSource: { type: "loser", match: 1 }, blueSource: { type: "loser", match: 2 } },
  { match: 6, label: "M6", region: "lower", round: 0, row: 1,
    redSource: { type: "loser", match: 3 }, blueSource: { type: "loser", match: 4 } },

  // Lower Bracket Round 2 (crossover)
  { match: 9, label: "M9", region: "lower", round: 1, row: 0,
    redSource: { type: "winner", match: 6 }, blueSource: { type: "loser", match: 7 } },
  { match: 10, label: "M10", region: "lower", round: 1, row: 1,
    redSource: { type: "winner", match: 5 }, blueSource: { type: "loser", match: 8 } },

  // Lower Bracket Round 3
  { match: 12, label: "M12", region: "lower", round: 2, row: 0,
    redSource: { type: "winner", match: 9 }, blueSource: { type: "winner", match: 10 } },

  // Lower Final
  { match: 13, label: "M13", region: "lower", round: 3, row: 0,
    redSource: { type: "loser", match: 11 }, blueSource: { type: "winner", match: 12 } },

  // Grand Finals (best of 3)
  { match: 14, label: "M14", region: "finals", round: 0, row: 0,
    redSource: { type: "winner", match: 11 }, blueSource: { type: "winner", match: 13 } },
  { match: 15, label: "M15", region: "finals", round: 0, row: 1,
    redSource: { type: "winner", match: 11 }, blueSource: { type: "winner", match: 13 } },
  { match: 16, label: "M16", region: "finals", round: 0, row: 2,
    redSource: { type: "winner", match: 11 }, blueSource: { type: "winner", match: 13 } },
];

// ---------------------------------------------------------------------------
// Alliance derivation
// ---------------------------------------------------------------------------

export function deriveAlliances(
  playoffMatches: TeamScheduleMatch[],
  ownerTeam: number,
  rankings: TeamRanking[] = [],
): Alliance[] {
  const matchByNum = new Map<number, TeamScheduleMatch>();
  for (const m of playoffMatches) matchByNum.set(m.match, m);

  const rankByTeam = new Map<number, number>();
  rankings.forEach((r, i) => rankByTeam.set(r.teamNumber, i + 1));

  function findCaptain(teams: number[]): number | null {
    let best: number | null = null;
    let bestRank = Infinity;
    for (const t of teams) {
      const rank = rankByTeam.get(t) ?? Infinity;
      if (rank < bestRank) {
        bestRank = rank;
        best = t;
      }
    }
    return best;
  }

  const alliances: Alliance[] = [];
  for (const [matchNum, [redSeed, blueSeed]] of Object.entries(SEED_BY_MATCH)) {
    const m = matchByNum.get(Number(matchNum));
    if (!m) continue;
    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    alliances.push({
      seed: redSeed,
      teams: redTeams,
      captain: findCaptain(redTeams),
      eliminated: false,
      isOwner: redTeams.includes(ownerTeam),
    });
    alliances.push({
      seed: blueSeed,
      teams: blueTeams,
      captain: findCaptain(blueTeams),
      eliminated: false,
      isOwner: blueTeams.includes(ownerTeam),
    });
  }

  alliances.sort((a, b) => a.seed - b.seed);

  // Determine elimination status by tracing bracket results
  const resolved = resolveBracket(playoffMatches);
  const eliminatedSeeds = new Set<number>();

  for (const rm of resolved) {
    if (rm.winner === null) continue;
    const loserSeed = rm.winner === "red" ? rm.blueSeed : rm.redSeed;
    if (loserSeed === null) continue;

    const slot = rm.slot;
    // Eliminated if lost in lower bracket (feedsLoserTo would be null in lower bracket)
    // Or more precisely: a team is eliminated when they lose and have no lower bracket path
    if (slot.region === "lower") {
      eliminatedSeeds.add(loserSeed);
    }
    // In finals, loser of best-of-3 is eliminated (check if they lost 2)
    if (slot.region === "finals") {
      // Count finals losses per seed
      const finalsMatches = resolved.filter((r) => r.slot.region === "finals" && r.winner !== null);
      const lossCount = new Map<number, number>();
      for (const fm of finalsMatches) {
        const fLoser = fm.winner === "red" ? fm.blueSeed : fm.redSeed;
        if (fLoser !== null) {
          lossCount.set(fLoser, (lossCount.get(fLoser) ?? 0) + 1);
        }
      }
      for (const [seed, count] of lossCount) {
        if (count >= 2) eliminatedSeeds.add(seed);
      }
    }
  }

  for (const a of alliances) {
    a.eliminated = eliminatedSeeds.has(a.seed);
  }

  return alliances;
}

// ---------------------------------------------------------------------------
// Bracket resolution
// ---------------------------------------------------------------------------

export function resolveBracket(
  playoffMatches: TeamScheduleMatch[],
): ResolvedMatch[] {
  const matchByNum = new Map<number, TeamScheduleMatch>();
  for (const m of playoffMatches) matchByNum.set(m.match, m);

  // First pass: resolve seed assignments from match data
  const seedByTeams = new Map<string, number>();
  for (const [matchNum, [redSeed, blueSeed]] of Object.entries(SEED_BY_MATCH)) {
    const m = matchByNum.get(Number(matchNum));
    if (!m) continue;
    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    const redKey = redTeams.sort().join(",");
    const blueKey = blueTeams.sort().join(",");
    if (redKey) seedByTeams.set(redKey, redSeed);
    if (blueKey) seedByTeams.set(blueKey, blueSeed);
  }

  function getTeamSeed(teams: number[]): number | null {
    const key = [...teams].sort().join(",");
    return seedByTeams.get(key) ?? null;
  }

  const results: ResolvedMatch[] = [];

  for (const slot of BRACKET_8) {
    const m = matchByNum.get(slot.match);
    if (!m) {
      results.push({
        slot,
        redSeed: null,
        blueSeed: null,
        redTeams: [],
        blueTeams: [],
        redScore: null,
        blueScore: null,
        winner: null,
        matchData: null,
      });
      continue;
    }

    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    const redSeed = getTeamSeed(redTeams);
    const blueSeed = getTeamSeed(blueTeams);
    const winner =
      m.winningAlliance === 1
        ? "red" as const
        : m.winningAlliance === 2
          ? "blue" as const
          : null;

    results.push({
      slot,
      redSeed,
      blueSeed,
      redTeams,
      blueTeams,
      redScore: m.redScore,
      blueScore: m.blueScore,
      winner,
      matchData: m,
    });
  }

  return results;
}

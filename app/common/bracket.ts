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

export type BracketFormat = "full8" | "finals3" | "none";

export interface BracketTopology {
  format: BracketFormat;
  slots: BracketSlot[];
  // First-round / seed-source matches: which seed pair plays each match.
  seedByMatch: Record<number, [number, number]>;
}

// ---------------------------------------------------------------------------
// Bracket topology for 8 alliances
// ---------------------------------------------------------------------------

const SEED_BY_MATCH_8: Record<number, [number, number]> = {
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

  // Lower Bracket Round 2 (crossover) — per FRC manual figure 13-1
  { match: 9, label: "M9", region: "lower", round: 1, row: 0,
    redSource: { type: "loser", match: 7 }, blueSource: { type: "winner", match: 6 } },
  { match: 10, label: "M10", region: "lower", round: 1, row: 1,
    redSource: { type: "loser", match: 8 }, blueSource: { type: "winner", match: 5 } },

  // Lower Bracket Round 3
  { match: 12, label: "M12", region: "lower", round: 2, row: 0,
    redSource: { type: "winner", match: 10 }, blueSource: { type: "winner", match: 9 } },

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
// Topology selection
// ---------------------------------------------------------------------------

export function detectBracketFormat(
  playoffMatches: TeamScheduleMatch[],
): BracketFormat {
  const n = playoffMatches.length;
  if (n === 0) return "none";
  if (n >= 4) return "full8";
  return "finals3";
}

function buildFinals3Topology(
  playoffMatches: TeamScheduleMatch[],
): BracketTopology {
  const sorted = [...playoffMatches].sort((a, b) => a.match - b.match).slice(0, 3);
  const slots: BracketSlot[] = sorted.map((m, i) => ({
    match: m.match,
    label: `F${i + 1}`,
    region: "finals" as const,
    round: 0,
    row: i,
    redSource: { type: "seed", seed: 1 },
    blueSource: { type: "seed", seed: 2 },
  }));
  // Use the lowest-numbered match as the seed source: red is seed 1, blue is seed 2.
  const seedByMatch: Record<number, [number, number]> = {};
  if (sorted.length > 0) {
    seedByMatch[sorted[0].match] = [1, 2];
  }
  return { format: "finals3", slots, seedByMatch };
}

function getTopology(playoffMatches: TeamScheduleMatch[]): BracketTopology {
  const format = detectBracketFormat(playoffMatches);
  if (format === "full8") {
    return { format, slots: BRACKET_8, seedByMatch: SEED_BY_MATCH_8 };
  }
  if (format === "finals3") {
    return buildFinals3Topology(playoffMatches);
  }
  return { format: "none", slots: [], seedByMatch: {} };
}

// ---------------------------------------------------------------------------
// Alliance derivation
// ---------------------------------------------------------------------------

export function deriveAlliances(
  playoffMatches: TeamScheduleMatch[],
  ownerTeam: number,
  rankings: TeamRanking[] = [],
): Alliance[] {
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

  // Resolve the bracket first so we know the seed of every match's red/blue
  // side, then union team numbers across every playoff match for each seed.
  // Backup robots may only appear in later matches, so a single-match lookup
  // misses them.
  const topology = getTopology(playoffMatches);
  const resolved = resolveBracketWithTopology(playoffMatches, topology);
  const teamsBySeed = new Map<number, number[]>();
  function addTeams(seed: number | null, teams: number[]) {
    if (seed == null) return;
    let list = teamsBySeed.get(seed);
    if (!list) {
      list = [];
      teamsBySeed.set(seed, list);
    }
    for (const t of teams) {
      if (!list.includes(t)) list.push(t);
    }
  }
  for (const rm of resolved) {
    addTeams(rm.redSeed, rm.redTeams);
    addTeams(rm.blueSeed, rm.blueTeams);
  }

  const alliances: Alliance[] = [];
  for (const [, [redSeed, blueSeed]] of Object.entries(topology.seedByMatch)) {
    for (const seed of [redSeed, blueSeed]) {
      const teams = teamsBySeed.get(seed);
      if (!teams || teams.length === 0) continue;
      alliances.push({
        seed,
        teams,
        captain: findCaptain(teams),
        eliminated: false,
        isOwner: teams.includes(ownerTeam),
      });
    }
  }

  alliances.sort((a, b) => a.seed - b.seed);

  // Determine elimination status by tracing bracket results
  const eliminatedSeeds = new Set<number>();

  for (const rm of resolved) {
    if (rm.winner === null) continue;
    const loserSeed = rm.winner === "red" ? rm.blueSeed : rm.redSeed;
    if (loserSeed === null) continue;

    const slot = rm.slot;
    // Eliminated if lost in lower bracket — no further lower-bracket path
    if (slot.region === "lower") {
      eliminatedSeeds.add(loserSeed);
    }
    // In finals (best-of-3), an alliance is eliminated after 2 losses
    if (slot.region === "finals") {
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
  return resolveBracketWithTopology(playoffMatches, getTopology(playoffMatches));
}

function resolveBracketWithTopology(
  playoffMatches: TeamScheduleMatch[],
  topology: BracketTopology,
): ResolvedMatch[] {
  const matchByNum = new Map<number, TeamScheduleMatch>();
  for (const m of playoffMatches) matchByNum.set(m.match, m);

  // First pass: resolve seed assignments from match data
  // Build both a team-list key map and a per-team map for robustness
  // (team composition can change between matches due to backup robots)
  const seedByTeams = new Map<string, number>();
  const seedByTeam = new Map<number, number>();
  for (const [matchNum, [redSeed, blueSeed]] of Object.entries(topology.seedByMatch)) {
    const m = matchByNum.get(Number(matchNum));
    if (!m) continue;
    const redTeams = [m.red1, m.red2, m.red3, m.red4].filter(Boolean);
    const blueTeams = [m.blue1, m.blue2, m.blue3, m.blue4].filter(Boolean);
    const redKey = redTeams.sort().join(",");
    const blueKey = blueTeams.sort().join(",");
    if (redKey) seedByTeams.set(redKey, redSeed);
    if (blueKey) seedByTeams.set(blueKey, blueSeed);
    for (const t of redTeams) seedByTeam.set(t, redSeed);
    for (const t of blueTeams) seedByTeam.set(t, blueSeed);
  }

  function getTeamSeed(teams: number[]): number | null {
    const key = [...teams].sort().join(",");
    const exact = seedByTeams.get(key);
    if (exact != null) return exact;
    // Fallback: look up any individual team (handles backup robot substitutions)
    for (const t of teams) {
      const seed = seedByTeam.get(t);
      if (seed != null) return seed;
    }
    return null;
  }

  const results: ResolvedMatch[] = [];

  for (const slot of topology.slots) {
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

/**
 * Returns true if a best-of-3 finals series is already decided (same alliance
 * won the first two finals matches), making the third match unnecessary.
 */
export function isFinalsDecided(resolved: ResolvedMatch[]): boolean {
  const finalsByRow = resolved
    .filter((rm) => rm.slot.region === "finals")
    .sort((a, b) => a.slot.row - b.slot.row);
  const first = finalsByRow[0];
  const second = finalsByRow[1];
  return (
    first?.winner != null &&
    second?.winner != null &&
    first.winner === second.winner
  );
}

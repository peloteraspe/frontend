import type { EventParticipant } from '@modules/admin/api/events/services/eventParticipants.service';

export type TeamSuggestionRole = 'goalkeeper' | 'defense' | 'midfield' | 'forward';

export type TeamSuggestionParticipant = Pick<
  EventParticipant,
  'userId' | 'name' | 'levelId' | 'levelName' | 'positions'
>;

export type TeamSuggestionSlot = {
  id: string;
  role: TeamSuggestionRole;
  roleLabel: string;
  slotLabel: string;
  player: TeamSuggestionParticipant | null;
  isAdapted: boolean;
};

export type SuggestedTeam = {
  id: 'A' | 'B';
  name: string;
  slots: TeamSuggestionSlot[];
  playerCount: number;
  totalLevelScore: number;
  matchedSlots: number;
  adaptedSlots: number;
};

export type TeamSuggestionMissingRole = {
  role: TeamSuggestionRole;
  label: string;
  count: number;
};

export type TeamSuggestionResult = {
  selectedCount: number;
  starterCount: number;
  extraParticipants: TeamSuggestionParticipant[];
  missingRoles: TeamSuggestionMissingRole[];
  missingPlayerCount: number;
  teams: SuggestedTeam[];
};

type TeamTemplate = {
  id: 'A' | 'B';
  name: string;
  slots: TeamSuggestionSlot[];
  totalLevelScore: number;
};

type NormalizedParticipant = TeamSuggestionParticipant & {
  roles: TeamSuggestionRole[];
  levelScore: number;
};

type FormationEntry = {
  role: TeamSuggestionRole;
  label: string;
  count: number;
};

type DistributionMetrics = {
  scoreA: number;
  scoreB: number;
  scoreDiff: number;
  matchedDiff: number;
  movementCount: number;
};

const TEAM_FORMATION: FormationEntry[] = [
  { role: 'goalkeeper', label: 'Portera', count: 1 },
  { role: 'defense', label: 'Defensa', count: 2 },
  { role: 'midfield', label: 'Mediocampo', count: 2 },
  { role: 'forward', label: 'Delantera', count: 1 },
];

const ROLE_PRIORITY: TeamSuggestionRole[] = ['goalkeeper', 'forward', 'defense', 'midfield'];

function normalizeText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function roleLabel(role: TeamSuggestionRole) {
  return TEAM_FORMATION.find((entry) => entry.role === role)?.label || 'Posición';
}

function slotLabel(role: TeamSuggestionRole, index: number) {
  const label = roleLabel(role);
  const count = TEAM_FORMATION.find((entry) => entry.role === role)?.count ?? 1;
  return count > 1 ? `${label} ${index + 1}` : label;
}

function getLevelScore(levelName: string, levelId: number | null) {
  const normalized = normalizeText(levelName);
  if (/sin experiencia|princip|inic|novat|basico/.test(normalized)) return 1;
  if (/interm|medio/.test(normalized)) return 2;
  if (/avanz|expert|compet|alto|elite|pro/.test(normalized)) return 3;

  const numericLevelId = Number(levelId);
  if (Number.isFinite(numericLevelId) && numericLevelId > 0) return numericLevelId;

  return 1.5;
}

function getRoles(positions: string[]) {
  const roles = new Set<TeamSuggestionRole>();

  positions.forEach((position) => {
    const normalized = normalizeText(position);
    if (!normalized) return;

    if (/port|arquer|keeper/.test(normalized)) roles.add('goalkeeper');
    if (/defen|lateral|central|back/.test(normalized)) roles.add('defense');
    if (/medio|mid|volant|pivot|pivote|enganche|contencion|interior/.test(normalized)) roles.add('midfield');
    if (/delant|atac|wing|extrem|punta|striker|forward/.test(normalized)) roles.add('forward');
  });

  return Array.from(roles);
}

function getParticipantScore(participant: TeamSuggestionParticipant | null) {
  if (!participant) return 0;
  return getLevelScore(participant.levelName, participant.levelId);
}

function matchesRole(participant: TeamSuggestionParticipant | null, role: TeamSuggestionRole) {
  if (!participant) return false;
  return getRoles(participant.positions ?? []).includes(role);
}

function toPublicParticipant(participant: NormalizedParticipant): TeamSuggestionParticipant {
  return {
    userId: participant.userId,
    name: participant.name,
    levelId: participant.levelId,
    levelName: participant.levelName,
    positions: [...participant.positions],
  };
}

function createTeam(id: 'A' | 'B'): TeamTemplate {
  const slots: TeamSuggestionSlot[] = [];

  TEAM_FORMATION.forEach((entry) => {
    for (let index = 0; index < entry.count; index += 1) {
      slots.push({
        id: `${id}-${entry.role}-${index + 1}`,
        role: entry.role,
        roleLabel: entry.label,
        slotLabel: slotLabel(entry.role, index),
        player: null,
        isAdapted: false,
      });
    }
  });

  return {
    id,
    name: `Equipo ${id}`,
    slots,
    totalLevelScore: 0,
  };
}

function getTeamOrder(teams: TeamTemplate[]) {
  return [...teams].sort((a, b) => {
    if (a.totalLevelScore !== b.totalLevelScore) return a.totalLevelScore - b.totalLevelScore;
    return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
  });
}

function compareMatchingCandidates(
  a: NormalizedParticipant,
  b: NormalizedParticipant,
  teamScore: number,
  otherTeamScore: number
) {
  if (a.roles.length !== b.roles.length) return a.roles.length - b.roles.length;

  const aGap = Math.abs(teamScore + a.levelScore - otherTeamScore);
  const bGap = Math.abs(teamScore + b.levelScore - otherTeamScore);
  if (aGap !== bGap) return aGap - bGap;

  if (teamScore <= otherTeamScore && a.levelScore !== b.levelScore) {
    return b.levelScore - a.levelScore;
  }

  if (teamScore > otherTeamScore && a.levelScore !== b.levelScore) {
    return a.levelScore - b.levelScore;
  }

  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

function compareFallbackCandidates(
  a: NormalizedParticipant,
  b: NormalizedParticipant,
  teamScore: number,
  otherTeamScore: number
) {
  const aGap = Math.abs(teamScore + a.levelScore - otherTeamScore);
  const bGap = Math.abs(teamScore + b.levelScore - otherTeamScore);
  if (aGap !== bGap) return aGap - bGap;

  if (teamScore <= otherTeamScore && a.levelScore !== b.levelScore) {
    return b.levelScore - a.levelScore;
  }

  if (teamScore > otherTeamScore && a.levelScore !== b.levelScore) {
    return a.levelScore - b.levelScore;
  }

  if (a.roles.length !== b.roles.length) return a.roles.length - b.roles.length;

  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

function fillNextRoleSlot(
  teams: TeamTemplate[],
  teamId: 'A' | 'B',
  role: TeamSuggestionRole,
  participant: NormalizedParticipant,
  isAdapted: boolean
) {
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) return false;

  const slot = team.slots.find((candidate) => candidate.role === role && !candidate.player);
  if (!slot) return false;

  slot.player = toPublicParticipant(participant);
  slot.isAdapted = isAdapted;
  team.totalLevelScore += participant.levelScore;
  return true;
}

function countMissingRoles(teams: TeamTemplate[]) {
  const missingCountByRole = new Map<TeamSuggestionRole, number>();

  teams.forEach((team) => {
    team.slots.forEach((slot) => {
      if (!slot.player || slot.isAdapted) {
        missingCountByRole.set(slot.role, (missingCountByRole.get(slot.role) ?? 0) + 1);
      }
    });
  });

  return TEAM_FORMATION.map((entry) => ({
    role: entry.role,
    label: entry.label,
    count: missingCountByRole.get(entry.role) ?? 0,
  })).filter((entry) => entry.count > 0);
}

function getIndexCombinations(length: number, choose: number) {
  const combinations: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === choose) {
      combinations.push([...current]);
      return;
    }

    for (let index = start; index < length; index += 1) {
      current.push(index);
      backtrack(index + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return combinations;
}

function compareDistributionMetrics(a: DistributionMetrics, b: DistributionMetrics) {
  if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
  if (a.matchedDiff !== b.matchedDiff) return a.matchedDiff - b.matchedDiff;
  return a.movementCount - b.movementCount;
}

function measureDistribution(params: {
  teamAIndexes: Set<number>;
  occupants: Array<TeamSuggestionParticipant | null>;
  teamASlotCount: number;
  role: TeamSuggestionRole;
  baseScoreA: number;
  baseScoreB: number;
}): DistributionMetrics {
  const { teamAIndexes, occupants, teamASlotCount, role, baseScoreA, baseScoreB } = params;

  let scoreA = baseScoreA;
  let scoreB = baseScoreB;
  let matchedA = 0;
  let matchedB = 0;
  let movementCount = 0;

  occupants.forEach((occupant, index) => {
    const goesToTeamA = teamAIndexes.has(index);
    const score = getParticipantScore(occupant);
    const isMatched = matchesRole(occupant, role);
    const originallyInTeamA = index < teamASlotCount;

    if (goesToTeamA) {
      scoreA += score;
      if (isMatched) matchedA += 1;
    } else {
      scoreB += score;
      if (isMatched) matchedB += 1;
    }

    if (occupant && goesToTeamA !== originallyInTeamA) {
      movementCount += 1;
    }
  });

  return {
    scoreA,
    scoreB,
    scoreDiff: Math.abs(scoreA - scoreB),
    matchedDiff: Math.abs(matchedA - matchedB),
    movementCount,
  };
}

function rebalanceRoleAssignments(teams: TeamTemplate[], role: TeamSuggestionRole) {
  const teamA = teams.find((team) => team.id === 'A');
  const teamB = teams.find((team) => team.id === 'B');
  if (!teamA || !teamB) return false;

  const teamASlots = teamA.slots.filter((slot) => slot.role === role);
  const teamBSlots = teamB.slots.filter((slot) => slot.role === role);
  if (!teamASlots.length || !teamBSlots.length) return false;

  const occupants = [...teamASlots, ...teamBSlots].map((slot) => slot.player);
  const teamASlotCount = teamASlots.length;
  const baseScoreA =
    teamA.totalLevelScore - teamASlots.reduce((total, slot) => total + getParticipantScore(slot.player), 0);
  const baseScoreB =
    teamB.totalLevelScore - teamBSlots.reduce((total, slot) => total + getParticipantScore(slot.player), 0);

  const currentIndexes = new Set(Array.from({ length: teamASlotCount }, (_, index) => index));
  const currentMetrics = measureDistribution({
    teamAIndexes: currentIndexes,
    occupants,
    teamASlotCount,
    role,
    baseScoreA,
    baseScoreB,
  });

  let bestIndexes = currentIndexes;
  let bestMetrics = currentMetrics;

  getIndexCombinations(occupants.length, teamASlotCount).forEach((combination) => {
    const candidateIndexes = new Set(combination);
    const candidateMetrics = measureDistribution({
      teamAIndexes: candidateIndexes,
      occupants,
      teamASlotCount,
      role,
      baseScoreA,
      baseScoreB,
    });

    if (compareDistributionMetrics(candidateMetrics, bestMetrics) < 0) {
      bestIndexes = candidateIndexes;
      bestMetrics = candidateMetrics;
    }
  });

  if (compareDistributionMetrics(bestMetrics, currentMetrics) >= 0) {
    return false;
  }

  const nextTeamAOccupants = occupants.filter((_, index) => bestIndexes.has(index));
  const nextTeamBOccupants = occupants.filter((_, index) => !bestIndexes.has(index));

  teamASlots.forEach((slot, index) => {
    const player = nextTeamAOccupants[index] ?? null;
    slot.player = player;
    slot.isAdapted = player ? !matchesRole(player, role) : false;
  });

  teamBSlots.forEach((slot, index) => {
    const player = nextTeamBOccupants[index] ?? null;
    slot.player = player;
    slot.isAdapted = player ? !matchesRole(player, role) : false;
  });

  teamA.totalLevelScore = bestMetrics.scoreA;
  teamB.totalLevelScore = bestMetrics.scoreB;
  return true;
}

export function suggestBalancedTeams(participants: EventParticipant[]): TeamSuggestionResult {
  const selected = participants.map<NormalizedParticipant>((participant) => ({
    userId: participant.userId,
    name: participant.name,
    levelId: participant.levelId,
    levelName: participant.levelName || 'Sin nivel',
    positions: participant.positions ?? [],
    roles: getRoles(participant.positions ?? []),
    levelScore: getLevelScore(participant.levelName, participant.levelId),
  }));

  const teams = [createTeam('A'), createTeam('B')];
  const remainingParticipants = [...selected];

  ROLE_PRIORITY.forEach((role) => {
    const requiredPerTeam = TEAM_FORMATION.find((entry) => entry.role === role)?.count ?? 0;

    for (let round = 0; round < requiredPerTeam; round += 1) {
      const teamOrder = getTeamOrder(teams);

      teamOrder.forEach((team) => {
        const otherTeam = teams.find((candidate) => candidate.id !== team.id) ?? team;
        const matchingCandidates = remainingParticipants
          .filter((participant) => participant.roles.includes(role))
          .sort((a, b) => compareMatchingCandidates(a, b, team.totalLevelScore, otherTeam.totalLevelScore));

        const selectedCandidate = matchingCandidates[0];
        if (!selectedCandidate) return;

        const wasAssigned = fillNextRoleSlot(teams, team.id, role, selectedCandidate, false);
        if (!wasAssigned) return;

        const selectedIndex = remainingParticipants.findIndex(
          (participant) => participant.userId === selectedCandidate.userId
        );
        if (selectedIndex >= 0) remainingParticipants.splice(selectedIndex, 1);
      });
    }
  });

  teams.forEach((team) => {
    team.slots.forEach((slot) => {
      if (slot.player || remainingParticipants.length === 0) return;

      const otherTeam = teams.find((candidate) => candidate.id !== team.id) ?? team;
      const fallbackCandidates = [...remainingParticipants].sort((a, b) =>
        compareFallbackCandidates(a, b, team.totalLevelScore, otherTeam.totalLevelScore)
      );
      const selectedCandidate = fallbackCandidates[0];
      if (!selectedCandidate) return;

      const wasAssigned = fillNextRoleSlot(
        teams,
        team.id,
        slot.role,
        selectedCandidate,
        !selectedCandidate.roles.includes(slot.role)
      );
      if (!wasAssigned) return;

      const selectedIndex = remainingParticipants.findIndex(
        (participant) => participant.userId === selectedCandidate.userId
      );
      if (selectedIndex >= 0) remainingParticipants.splice(selectedIndex, 1);
    });
  });

  let didRebalance = true;
  while (didRebalance) {
    didRebalance = false;

    TEAM_FORMATION.forEach((entry) => {
      if (rebalanceRoleAssignments(teams, entry.role)) {
        didRebalance = true;
      }
    });
  }

  const finalizedTeams: SuggestedTeam[] = teams.map((team) => {
    const playerCount = team.slots.filter((slot) => Boolean(slot.player)).length;
    const matchedSlots = team.slots.filter((slot) => slot.player && !slot.isAdapted).length;
    const adaptedSlots = team.slots.filter((slot) => slot.player && slot.isAdapted).length;

    return {
      id: team.id,
      name: team.name,
      slots: team.slots,
      playerCount,
      totalLevelScore: team.totalLevelScore,
      matchedSlots,
      adaptedSlots,
    };
  });

  return {
    selectedCount: selected.length,
    starterCount: finalizedTeams.reduce((total, team) => total + team.playerCount, 0),
    extraParticipants: remainingParticipants
      .map((participant) => toPublicParticipant(participant))
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    missingRoles: countMissingRoles(teams),
    missingPlayerCount: finalizedTeams.reduce(
      (total, team) => total + team.slots.filter((slot) => !slot.player).length,
      0
    ),
    teams: finalizedTeams,
  };
}

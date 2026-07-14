export const FACTIONS = ['rock', 'paper', 'scissors'] as const;
export type Faction = (typeof FACTIONS)[number];
export type Relationship = 'ally' | 'prey' | 'predator';

const PREY: Record<Faction, Faction> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export function getPrey(faction: Faction): Faction {
  return PREY[faction];
}

export function getPredator(faction: Faction): Faction {
  return FACTIONS.find((candidate) => PREY[candidate] === faction)!;
}

export function getRelationship(source: Faction, target: Faction): Relationship {
  if (source === target) return 'ally';
  return getPrey(source) === target ? 'prey' : 'predator';
}

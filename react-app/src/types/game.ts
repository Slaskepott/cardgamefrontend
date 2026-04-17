export type Suit = "Fire" | "Air" | "Earth" | "Water";

export interface Card {
  rank: string;
  suit: Suit;
}

export interface Upgrade {
  id: number;
  name: string;
  tier: number;
  rarity: string;
  effect: string;
  cost: number;
}

export interface BattleMoment {
  attacker: string;
  target: string | null;
  damage: number;
  handType: string;
  multiplier: number;
  accentSuit: Suit | null;
  winner: string | null;
}

export interface DiscardMoment {
  cards: Card[];
  remainingDiscards: number;
}

export interface MetaAchievement {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  unlocked: boolean;
}

export interface MetaTalent {
  id: string;
  specialization: string;
  name: string;
  description: string;
  cost: number;
  requires: string[];
  row: number;
  column: number;
  unlocked: boolean;
  available: boolean;
}

export interface MetaSpecialization {
  id: string;
  name: string;
  description: string;
}

export interface MetaProgress {
  achievement_points: number;
  available_talent_points: number;
  achievement_count: number;
  stats: Record<string, number>;
  achievements: MetaAchievement[];
  talents: MetaTalent[];
  specializations: MetaSpecialization[];
  selected_specialization: string | null;
  talent_bonuses: Record<string, number>;
}

export interface HealthUpdate {
  [playerId: string]: number;
}

export interface ScoreUpdate {
  [playerId: string]: number;
}

export interface ApplyUpgradesMessage {
  type: "apply_upgrades";
  player: string;
  health: number;
  max_health: number;
  max_discards: number;
}

export interface OpenStoreMessage {
  type: "open_store";
  player: string;
  upgrades: Upgrade[];
}

export interface HandPlayedMessage {
  type: "hand_played";
  player: string;
  cards: Card[];
  damage: number;
  health_update: HealthUpdate;
  max_health_update: HealthUpdate;
  score_update: ScoreUpdate;
  next_player: string;
  hand_type: string;
  new_hand: Card[];
  multiplier: number;
  winner: string | null;
  remaining_discards: number;
  gold: number;
}

export interface PlayersUpdatedMessage {
  type: "players_updated";
  players: string[];
  next_player?: string | null;
}

export interface NewHandMessage {
  type: "new_hand";
  player: string;
  cards: Card[];
  next_player?: string | null;
}

export interface HandUpdatedMessage {
  type: "hand_updated";
  player: string;
  cards: Card[];
  remaining_discards: number;
}

export interface TurnEndedMessage {
  message: string;
  next_player: string;
}

export type GameSocketMessage =
  | HandPlayedMessage
  | PlayersUpdatedMessage
  | NewHandMessage
  | HandUpdatedMessage
  | OpenStoreMessage
  | ApplyUpgradesMessage
  | TurnEndedMessage
  | Record<string, unknown>;

export interface CreateGameResponse {
  message?: string;
  error?: string;
}

export interface JoinGameResponse {
  message?: string;
  error?: string;
}

export interface PlayersResponse {
  players?: string[];
  next_player?: string | null;
  error?: string;
}

export interface LobbySummary {
  game_id: string;
  player_count: number;
  players: string[];
}

export interface LobbiesResponse {
  games: LobbySummary[];
}

export interface ActionResponse {
  message?: string;
  error?: string;
}

export interface LeaveGameResponse extends ActionResponse {
  players?: string[];
  next_player?: string | null;
}

export interface DiscardResponse extends ActionResponse {
  discarded?: Card[];
  new_hand?: Card[];
  remaining_discards?: number;
}

export interface PlayHandResponse extends ActionResponse {
  damage?: number;
  multiplier?: number;
  new_hand?: Card[];
  winner?: string | null;
}

export interface BuyUpgradeResponse extends ActionResponse {
  price?: number;
}

export interface MetaProgressResponse extends MetaProgress {
  error?: string;
}

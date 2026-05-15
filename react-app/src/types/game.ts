export type Suit = "Fire" | "Air" | "Earth" | "Water" | "Plasma" | "Wild";

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

export interface Relic {
  id: string;
  name: string;
  theme: string;
  description: string;
}

export interface MetaSpell {
  id: string;
  name: string;
  description: string;
  effect_type: "instant" | "hand";
  animation: string;
  unlock_source: string;
  unlocked: boolean;
  equipped: boolean;
}

export interface MatchSpell {
  id: string;
  name: string;
  description: string;
  effect_type: "instant" | "hand";
  animation: string;
  used: boolean;
  prepared: boolean;
}

export interface ChatMessage {
  id: string;
  scope: "global" | "game";
  game_id: string | null;
  author: string;
  avatar: string;
  text: string;
  created_at: number;
}

export interface BattleMoment {
  attacker: string;
  target: string | null;
  damage: number;
  damageInstances: number[];
  hits: number;
  doublePlayTriggered: boolean;
  handType: string;
  multiplier: number;
  accentSuit: Suit | null;
  winner: string | null;
  matchFinished?: boolean;
  spellEffectId?: string | null;
  spellEffectName?: string | null;
}

export interface SpellMoment {
  player: string;
  spellId: string;
  spellName: string;
  animation: string;
  effectNow: boolean;
}

export interface DiscardMoment {
  cards: Card[];
  remainingDiscards: number;
}

export interface MetaAchievement {
  id: string;
  stat: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  points: number;
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
  max_ranks: number;
  current_rank: number;
  unlocked: boolean;
  available: boolean;
  element_options: string[];
  selected_element: string | null;
}

export interface MetaSpecialization {
  id: string;
  name: string;
  description: string;
}

export interface LevelMilestone {
  id: string;
  level: number;
  name: string;
  description: string;
  unlocked: boolean;
}

export interface MetaProgress {
  level: number;
  elo_rating: number;
  experience_total: number;
  experience_in_level: number;
  experience_for_next_level: number;
  achievement_points: number;
  available_talent_points: number;
  achievement_count: number;
  stats: Record<string, number>;
  achievements: MetaAchievement[];
  talents: MetaTalent[];
  specializations: MetaSpecialization[];
  selected_specialization: string | null;
  talent_bonuses: Record<string, number>;
  level_milestones: LevelMilestone[];
  unlocked_level_rewards: string[];
  campaign_progress: CampaignProgress;
  campaign_nodes: CampaignNode[];
  unlocked_icons: string[];
  unlocked_borders: string[];
  selected_icon: string | null;
  selected_border: string | null;
  spells: MetaSpell[];
  equipped_spell_ids: string[];
}

export interface CampaignProgress {
  current_node_id: string;
  cleared_node_ids: string[];
  completed: boolean;
}

export interface CampaignNode {
  id: string;
  region: number;
  index: number;
  name: string;
  type: "bo3" | "bo5" | "boss";
  best_of: number;
  wins_to_clinch: number;
  description: string;
}

export interface PlayerCosmetics {
  selected_icon: string | null;
  selected_border: string | null;
  unlocked_icons: string[];
  unlocked_borders: string[];
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
  armor: number;
  armor_reduction_pct: number;
  upgrades: Upgrade[];
  relics?: Relic[];
}

export interface OpenStoreMessage {
  type: "open_store";
  player: string;
  upgrades: Upgrade[];
  waiting_players?: string[];
  rerolls_remaining?: number;
  health_update?: HealthUpdate;
  max_health_update?: HealthUpdate;
}

export interface ShopStatusMessage {
  type: "shop_status";
  waiting_players: string[];
}

export interface RelicStatusMessage {
  type: "relic_status";
  waiting_players: string[];
}

export interface OpenRelicsMessage {
  type: "open_relics";
  player: string;
  relics: Relic[];
  waiting_players?: string[];
}

export interface MatchStateMessage {
  type: "match_state";
  phase: "waiting" | "battle" | "shop" | "relic" | "match_over";
  current_turn: string | null;
  battle_deadline_at: number | null;
  shop_deadlines: Record<string, number>;
  waiting_players: string[];
  relic_waiting_players?: string[];
  relics_by_player?: Record<string, Relic[]>;
  spells_by_player?: Record<string, MatchSpell[]>;
  wins_to_clinch: number;
  best_of: number;
  match_winner: string | null;
  match_end_reason: string | null;
  is_bot_match?: boolean;
  is_campaign_match?: boolean;
  campaign_node_id?: string | null;
}

export interface EloChange {
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface MatchOverMessage {
  type: "match_over";
  winner: string;
  loser: string | null;
  reason: string;
  scores: Record<string, number>;
  avatars: Record<string, string>;
  avatar_borders?: Record<string, string>;
  elo_changes: Record<string, EloChange>;
  is_bot_match?: boolean;
  is_campaign_match?: boolean;
  campaign_node_id?: string | null;
  progression_disabled?: boolean;
}

export interface HandPlayedMessage {
  type: "hand_played";
  player: string;
  cards: Card[];
  damage: number;
  raw_damage?: number;
  armor_mitigation_pct?: number;
  rank_resistance_mitigation_pct?: number;
  hand_type_mitigation_pct?: number;
  spell_mitigation_pct?: number;
  damage_instances?: number[];
  hits?: number;
  double_play_triggered?: boolean;
  health_update: HealthUpdate;
  max_health_update: HealthUpdate;
  armor_update?: HealthUpdate;
  armor_reduction_update?: HealthUpdate;
  score_update: ScoreUpdate;
  next_player: string;
  hand_type: string;
  new_hand: Card[];
  multiplier: number;
  winner: string | null;
  round_finished?: boolean;
  match_finished?: boolean;
  remaining_discards: number;
  gold: number;
  spell_effect_id?: string | null;
  spell_effect_name?: string | null;
  spells_by_player?: Record<string, MatchSpell[]>;
}

export interface SpellUsedMessage {
  type: "spell_used";
  player: string;
  spell_id: string;
  spell_name: string;
  animation: string;
  effect_now: boolean;
  health_update: HealthUpdate;
  max_health_update: HealthUpdate;
  armor_update: HealthUpdate;
  gold_update: HealthUpdate;
  remaining_discards_update: Record<string, number>;
  spells_by_player: Record<string, MatchSpell[]>;
}

export interface PlayersUpdatedMessage {
  type: "players_updated";
  players: string[];
  next_player?: string | null;
  avatars?: Record<string, string>;
  avatar_borders?: Record<string, string>;
}

export interface NewHandMessage {
  type: "new_hand";
  player: string;
  cards: Card[];
  next_player?: string | null;
  remaining_discards?: number;
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
  | ShopStatusMessage
  | RelicStatusMessage
  | OpenRelicsMessage
  | MatchStateMessage
  | MatchOverMessage
  | SpellUsedMessage
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

export interface StartBotGameResponse {
  message?: string;
  error?: string;
  game_id?: string;
  player_id?: string;
  bot_player_id?: string;
  difficulty?: "easy" | "medium" | "hard";
  is_campaign_match?: boolean;
  campaign_node_id?: string;
  best_of?: number;
  wins_to_clinch?: number;
}

export interface PlayersResponse {
  players?: string[];
  next_player?: string | null;
  avatars?: Record<string, string>;
  avatar_borders?: Record<string, string>;
  phase?: "waiting" | "battle" | "shop" | "relic" | "match_over";
  battle_deadline_at?: number | null;
  shop_deadlines?: Record<string, number>;
  is_bot_match?: boolean;
  is_campaign_match?: boolean;
  campaign_node_id?: string | null;
  best_of?: number;
  wins_to_clinch?: number;
  relics_by_player?: Record<string, Relic[]>;
  spells_by_player?: Record<string, MatchSpell[]>;
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
  gold?: number;
}

export interface PlayHandResponse extends ActionResponse {
  damage?: number;
  multiplier?: number;
  new_hand?: Card[];
  winner?: string | null;
  round_finished?: boolean;
  match_finished?: boolean;
  gold?: number;
  spell_effect_id?: string | null;
}

export interface BuyUpgradeResponse extends ActionResponse {
  price?: number;
}

export interface ContinueFromShopResponse extends ActionResponse {
  waiting_players?: string[];
}

export interface RerollShopResponse extends ActionResponse {
  upgrades?: Upgrade[];
  rerolls_remaining?: number;
  health?: number;
}

export interface HeartbeatResponse extends ActionResponse {
  phase?: "waiting" | "battle" | "shop" | "relic" | "match_over";
  resolved?: boolean;
}

export interface ChooseRelicResponse extends ActionResponse {
  waiting_players?: string[];
}

export interface UseSpellResponse extends ActionResponse {
  spell_id?: string;
  spell_name?: string;
  animation?: string;
  effect_now?: boolean;
}

export interface ChatResponse {
  error?: string;
  messages?: ChatMessage[];
  message?: ChatMessage | string;
}

export interface MetaProgressResponse extends MetaProgress {
  error?: string;
}

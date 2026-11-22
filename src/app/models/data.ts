// Shapes of the game server's JSON, as described in game_documentation.tex (section "API").

export type Action = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'WAIT';

/** How the frontend sends the player's moves. See "Dva načina igranja" in the docs. */
export type ControlMode = 'async' | 'step';

export interface EpisodeConfig {
  gatePrice: number;
  merchantBudget: number;
  merchantRefillRounds: number;
  barbarianEnabled: boolean;
  villagerEnabled: boolean;
  maxRounds: number;
}

/** Response of PUT /map/restart */
export interface RestartResponse {
  gameId: string;
  seed: number;
  mapNumber: number;
  config: EpisodeConfig;
}

/** Response of POST /game/step and GET /game/state */
export interface GameState {
  gameId: string;
  matrix: string[][];
  inventory: { [material: string]: number };
  gold: number;
  round: number;
  done: boolean;
  won: boolean;
  events: string[];
  /** -1 when the map has no gate */
  gatePrice: number;
  /** -1 when the map has no merchant */
  merchantGold: number;
  seed: number;
  /** 0 when there is no limit */
  maxRounds: number;
}

/** What the restart dialog edits. Config is only sent when overrideConfig is true. */
export interface RestartOptions {
  mapNumber: number;
  /** null = let the server pick (it is returned in the response) */
  seed: number | null;
  overrideConfig: boolean;
  config: EpisodeConfig;
}

export interface RestartDialogData {
  gameId: string;
  options: RestartOptions;
}

export interface EventLogEntry {
  round: number;
  events: string[];
}

export interface GameOverData {
  gameId: string;
  won: boolean;
  outOfTime: boolean;
  round: number;
  maxRounds: number;
  gold: number;
  gatePrice: number;
  seed: number;
  mapNumber: number | null;
}

export type GameOverChoice = 'replay' | 'new' | 'next' | 'configure';

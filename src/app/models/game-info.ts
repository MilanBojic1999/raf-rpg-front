// Static game rules, copied from game_documentation.tex. Used for images, tooltips and the HUD.

import {Action, EpisodeConfig} from './data';

export const MAP_COUNT = 6;

export const DEFAULT_CONFIG: EpisodeConfig = {
  gatePrice: 50,
  merchantBudget: 50,
  merchantRefillRounds: 4,
  barbarianEnabled: true,
  villagerEnabled: true,
  maxRounds: 500,
};

export interface MaterialInfo {
  label: string;
  value: number;
}

/** Keyed by the API name (the one used in `inventory` and in events). */
export const MATERIALS: { [apiName: string]: MaterialInfo } = {
  Gem: {label: 'Gem', value: 20},
  Ore: {label: 'Ore', value: 14},
  Apple: {label: 'Apple', value: 7},
  Rice: {label: 'Rice', value: 4},
  Stone: {label: 'Stone', value: 3},
  Bones: {label: 'Bones', value: 2},
  Wood: {label: 'Wood', value: 2},
  Grass: {label: 'Grass', value: 0},
};

export function materialValue(name: string): number {
  return MATERIALS[name]?.value ?? 0;
}

export function materialImage(name: string): string {
  return `assets/game loot/${name}.png`;
}

export interface SymbolInfo {
  name: string;
  image: string;
  /** Hover text: what the symbol means and what it can give. */
  description: string;
}

const tile = (file: string) => `assets/game tiles/${file}.png`;
const character = (file: string) => `assets/game characters/${file}.png`;

export const SYMBOLS: { [symbol: string]: SymbolInfo } = {
  '_': {name: 'Pasture', image: tile('Pasture_Tile'),
    description: 'Pasture, not looted. Gem 2%, Rice 43%, Grass 55% (expected 2.12 gold)'},
  '.': {name: 'Pasture (looted)', image: tile('Pasture_Tile_Looted'), description: 'Pasture, already looted'},
  '+': {name: 'Forest', image: tile('Wood_Tile'),
    description: 'Forest, not looted. Stone 5%, Apple 40%, Wood 55% (expected 4.05 gold)'},
  ':': {name: 'Forest (looted)', image: tile('Wood_Tile_Looted'), description: 'Forest, already looted'},
  '>': {name: 'Elevation', image: tile('Elevation_Tile'),
    description: 'Elevation, not looted. Gem 10%, Wood 15%, Bones 35%, Grass 40% (expected 3.00 gold). '
      + 'The only way onto and off a mountain.'},
  '<': {name: 'Elevation (looted)', image: tile('Elevation_Tile_Looted'),
    description: 'Elevation, already looted. The only way onto and off a mountain.'},
  '$': {name: 'Mountain', image: tile('Mountain_Tile'),
    description: 'Mountain, not looted. Gem 6%, Ore 4%, Bones 20%, Stone 70% (expected 4.26 gold). '
      + 'Reachable only from an elevation or another mountain.'},
  '^': {name: 'Mountain (looted)', image: tile('Mountain_Tile_Looted'),
    description: 'Mountain, already looted. Reachable only from an elevation or another mountain.'},
  '-': {name: 'Water', image: tile('Water_Tile'), description: 'Water, not reachable'},
  // Older server versions used a space for empty cells; draw it as water.
  ' ': {name: 'Water', image: tile('Water_Tile'), description: 'Water, not reachable'},
  '|': {name: 'Gate', image: tile('Gate_Tile'),
    description: 'Gate. Step on it with enough gold to win the episode.'},
  'P': {name: 'Player', image: character('Player_model'), description: 'Player (you or your agent)'},
  'V': {name: 'Villager', image: character('Village'),
    description: 'Villager. Moves every 3rd round. Gives a gift when you are directly next to it: '
      + 'Gem 5%, Wood 40%, Rice 55% (expected 4.0 gold).'},
  'B': {name: 'Barbarian', image: character('Barbarian'),
    description: 'Barbarian. Moves every 2nd round. When directly next to you, it picks a random material '
      + 'and steals 0 to n-1 of it.'},
  'M': {name: 'Merchant', image: character('Merchant'),
    description: 'Merchant. Walk into it to sell: it buys the most valuable stacks first, '
      + 'as long as its budget lasts. The budget refills every few rounds.'},
};

/** Legend order shown in the side panel. */
export const LEGEND_SYMBOLS = ['_', '+', '>', '$', '|', '-', 'P', 'V', 'B', 'M'];

export const KEY_ACTIONS: { [code: string]: Action } = {
  ArrowUp: 'UP', KeyW: 'UP',
  ArrowDown: 'DOWN', KeyS: 'DOWN',
  ArrowLeft: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', KeyD: 'RIGHT',
  Space: 'WAIT', Period: 'WAIT',
};

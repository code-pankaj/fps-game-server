/**
 * Shared types between client and server
 * Copy this file to both client and server projects
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  pitch: number; // X rotation
  yaw: number;   // Y rotation
}

export interface PlayerInput {
  movement: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
  };
  rotation: Rotation;
  shooting: boolean;
  timestamp: number;
  sequenceNumber: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Rotation;
  velocity: Vector3;
  health: number;
  alive: boolean;
  username: string;
  kills?: number;
}

export interface GameState {
  tick: number;
  timestamp: number;
  players: { [id: string]: PlayerState };
  scores?: { [username: string]: number };
  roomId?: number;
}

export interface ShootEvent {
  playerId: string;
  origin: Vector3;
  direction: Vector3;
  timestamp: number;
}

export interface HitEvent {
  shooterId: string;
  victimId: string;
  damage: number;
  hitPosition: Vector3;
}

// Network message types
export enum MessageType {
  // Client -> Server
  PLAYER_JOIN = 'player_join',
  PLAYER_INPUT = 'player_input',
  PLAYER_SHOOT = 'player_shoot',
  PLAYER_DISCONNECT = 'player_disconnect',
  
  // Server -> Client
  GAME_STATE = 'game_state',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_SHOT = 'player_shot',
  PLAYER_HIT = 'player_hit',
  PLAYER_DIED = 'player_died',
  SCORE_UPDATE = 'score_update',
  MATCH_WON = 'match_won',
}

export interface NetworkMessage {
  type: MessageType;
  data: any;
  timestamp: number;
}

export interface JoinMessage {
  username: string;
}

export interface JoinedMessage {
  playerId: string;
  gameState: GameState;
}

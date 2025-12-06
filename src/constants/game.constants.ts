/**
 * Shared game constants
 */

export const GAME_CONSTANTS = {
  // Player physics
  PLAYER_HEIGHT: 1.8,
  PLAYER_RADIUS: 0.3,
  CAMERA_HEIGHT: 1.65,
  WALK_SPEED: 6.864,
  JUMP_HEIGHT: 1.1,
  
  // Weapon
  FIRE_RATE: 100, // ms between shots
  WEAPON_DAMAGE: 25,
  MAX_AMMO: 30,
  RELOAD_TIME: 2000, // ms
  
  // Network
  TICK_RATE: 60, // Server updates per second
  CLIENT_UPDATE_RATE: 60, // Client sends input per second
  INTERPOLATION_DELAY: 100, // ms - lag compensation
  
  // Game
  MAX_PLAYERS: 16,
  RESPAWN_TIME: 3000, // ms
  MAX_HEALTH: 100,
  
  // Physics
  GRAVITY: -9.81,
  FIXED_TIMESTEP: 1 / 60,
};

export const MAP_CONSTANTS = {
  DEFAULT_MAP: 'compressed_invasion',
  SPAWN_POINTS: [
    { x: -0.28, y: 0.32, z: -0.40 },
    { x: 61.23, y: 4.27, z: 20.14 },
    { x: 39.90, y: 0.33, z: -37.55 },
    { x: -19.97, y: 2.77, z: -39.83 },
    { x: -52.48, y: 2.75, z: -8.25 },
    { x: -36.58, y: 0.33, z: 29.67 },
  ],
};

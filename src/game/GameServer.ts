import RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerState, GameState } from '../types/game.types.js';
import { GAME_CONSTANTS, MAP_CONSTANTS } from '../constants/game.constants.js';
import { ServerPlayer } from '../player/ServerPlayer.js';

/**
 * Main game server - handles game state, physics, and player management
 */
export class GameServer {
  private world: RAPIER.World | null = null;
  private rapier: typeof RAPIER | null = null;
  private players: Map<string, ServerPlayer> = new Map();
  private tick: number = 0;
  private lastUpdate: number = 0;
  private running: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private scores: Map<string, number> = new Map();
  private winPoints = 3;
  private usedSpawnIndices: Set<number> = new Set();
  private roomId: number;

  constructor(roomId: number = 0) {
    this.roomId = roomId;
  }

  async initialize(): Promise<void> {
    // Initialize RAPIER physics
    await RAPIER.init();
    this.rapier = RAPIER;
    
    const gravity = new RAPIER.Vector3(0.0, GAME_CONSTANTS.GRAVITY, 0.0);
    this.world = new RAPIER.World(gravity);
    
    // Create ground collider
    this.createGroundCollider();
    
    console.log('✅ Physics engine initialized');
    console.log(`🧭 Loaded ${MAP_CONSTANTS.SPAWN_POINTS.length} spawn points:`);
    MAP_CONSTANTS.SPAWN_POINTS.forEach((sp, i) => {
      console.log(`   [${i}] (${sp.x.toFixed(2)}, ${sp.y.toFixed(2)}, ${sp.z.toFixed(2)})`);
    });
    
    // Start game loop
    this.start();
  }

  private createGroundCollider(): void {
    if (!this.world) return;
    
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1, 0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    
    const groundColliderDesc = RAPIER.ColliderDesc.cuboid(50, 0.1, 50);
    this.world.createCollider(groundColliderDesc, groundBody);
  }

  start(): void {
    this.running = true;
    this.lastUpdate = Date.now();
    
    // Fixed tick rate game loop
    const tickRate = 1000 / GAME_CONSTANTS.TICK_RATE;
    this.tickInterval = setInterval(() => this.update(), tickRate);
    
    console.log(`✅ Game loop started at ${GAME_CONSTANTS.TICK_RATE}Hz`);
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    console.log('⏹️  Game loop stopped');
  }

  private update(): void {
    if (!this.world || !this.running) return;
    
    const now = Date.now();
    const deltaTime = GAME_CONSTANTS.FIXED_TIMESTEP;
    
    // Step physics
    this.world.step();
    
    // Update all players
    for (const player of this.players.values()) {
      player.update(deltaTime);
    }
    
    this.tick++;
    this.lastUpdate = now;
  }

  addPlayer(id: string, username: string): ServerPlayer {
    const { spawn, index } = this.allocateSpawn();
    const player = new ServerPlayer(id, username, this.world!, this.rapier!, spawn, index);
    this.players.set(id, player);
    this.scores.set(username, 0);
    
    console.log(`✅ Player joined: ${username} (${id})`);
    console.log(`👥 Total players: ${this.players.size}`);
    
    return player;
  }

  private allocateSpawn(): { spawn: { x: number; y: number; z: number }; index: number } {
    // Find unused indices
    const allIndices = MAP_CONSTANTS.SPAWN_POINTS.map((_, i) => i);
    const free = allIndices.filter(i => !this.usedSpawnIndices.has(i));
    let chosenIndex: number;
    if (free.length === 0) {
      // All used, allow reuse (rare when players > spawn points)
      chosenIndex = Math.floor(Math.random() * MAP_CONSTANTS.SPAWN_POINTS.length);
    } else {
      chosenIndex = free[Math.floor(Math.random() * free.length)];
    }
    this.usedSpawnIndices.add(chosenIndex);
    const spawn = MAP_CONSTANTS.SPAWN_POINTS[chosenIndex];
    console.log(`🎯 Allocated spawn index ${chosenIndex} at (${spawn.x.toFixed(2)}, ${spawn.y.toFixed(2)}, ${spawn.z.toFixed(2)})`);
    return { spawn, index: chosenIndex };
  }

  releaseSpawn(index: number): void {
    this.usedSpawnIndices.delete(index);
  }

  respawnPlayer(player: ServerPlayer): void {
    const prevIndex = player.getSpawnIndex();
    this.releaseSpawn(prevIndex);
    const { spawn, index } = this.allocateSpawn();
    player.respawn(spawn, index);
    console.log(`🔄 Respawned player ${player.getState().username} at new spawn index ${index}`);
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (player) {
      // Release the spawn index so a future player can use it
      const index = player.getSpawnIndex?.() ?? null;
      if (index !== null) {
        this.releaseSpawn(index);
        console.log(`🏁 Released spawn index ${index} from ${player.getState().username}`);
      }
      player.destroy();
      this.players.delete(id);
      this.scores.delete(player.getState().username);
      console.log(`👋 Player left: ${player.getState().username} (${id})`);
      console.log(`👥 Total players: ${this.players.size}`);
    }
  }

  getPlayer(id: string): ServerPlayer | undefined {
    return this.players.get(id);
  }

  getGameState(): GameState {
    const playersState: { [id: string]: PlayerState } = {};
    
    for (const [id, player] of this.players) {
      playersState[id] = player.getState();
    }
    
    return {
      tick: this.tick,
      timestamp: Date.now(),
      players: playersState,
      scores: Object.fromEntries(this.scores.entries()),
      roomId: this.roomId,
    };
  }

  addKill(shooterName: string): { winner?: string; scores: { [name: string]: number } } {
    const current = this.scores.get(shooterName) ?? 0;
    const next = current + 1;
    this.scores.set(shooterName, next);
    const scoresObj = Object.fromEntries(this.scores.entries());
    if (next >= this.winPoints) {
      return { winner: shooterName, scores: scoresObj };
    }
    return { scores: scoresObj };
  }

  getPlayers(): Map<string, ServerPlayer> {
    return this.players;
  }
}

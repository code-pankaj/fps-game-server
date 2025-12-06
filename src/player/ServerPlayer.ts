import type RAPIER from '@dimforge/rapier3d-compat';
import type { PlayerState, PlayerInput, Vector3, Rotation } from '../types/game.types.js';
import { GAME_CONSTANTS } from '../constants/game.constants.js';

/**
 * Server-side player with physics and state management
 */
export class ServerPlayer {
  private id: string;
  private username: string;
  private position: Vector3;
  private rotation: Rotation;
  private velocity: Vector3;
  private health: number;
  private alive: boolean;
  private rigidBody: RAPIER.RigidBody | null = null;
  private world: RAPIER.World;
  private rapier: typeof RAPIER;
  private spawnIndex: number;
  
  // Input state
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private canJump = false;

  constructor(id: string, username: string, world: RAPIER.World, rapier: typeof RAPIER, spawn: Vector3, spawnIndex: number) {
    this.id = id;
    this.username = username;
    this.world = world;
    this.rapier = rapier;
    this.health = GAME_CONSTANTS.MAX_HEALTH;
    this.alive = true;
    this.position = { ...spawn };
    this.spawnIndex = spawnIndex;
    this.rotation = { pitch: 0, yaw: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    
    this.createPhysicsBody();
  }

  private createPhysicsBody(): void {
    // Create capsule rigid body for player
    const bodyDesc = this.rapier.RigidBodyDesc.dynamic()
      .setTranslation(this.position.x, this.position.y, this.position.z)
      .lockRotations();
    
    this.rigidBody = this.world.createRigidBody(bodyDesc);
    
    // Create capsule collider
    const colliderDesc = this.rapier.ColliderDesc.capsule(
      GAME_CONSTANTS.PLAYER_HEIGHT / 2 - GAME_CONSTANTS.PLAYER_RADIUS,
      GAME_CONSTANTS.PLAYER_RADIUS
    );
    
    this.world.createCollider(colliderDesc, this.rigidBody);
  }

  /**
   * Update player state from client position update
   * For server-authoritative multiplayer with client-side prediction
   */
  updateFromClient(position: Vector3, rotation: Rotation, velocity: Vector3): void {
    // Don't accept position updates from dead players (server controls respawn)
    if (!this.alive) return;
    
    // Update position
    this.position = position;
    this.rotation = rotation;
    this.velocity = velocity;
    
    // Update physics body to match client position
    if (this.rigidBody) {
      this.rigidBody.setTranslation(position, true);
      this.rigidBody.setLinvel(velocity, true);
    }
  }

  update(deltaTime: number): void {
    if (!this.rigidBody || !this.alive) return;
    
    // Get current velocity
    const linvel = this.rigidBody.linvel();
    const currentVelocity = { x: linvel.x, y: linvel.y, z: linvel.z };
    
    // Calculate movement direction
    const forward = {
      x: -Math.sin(this.rotation.yaw),
      z: -Math.cos(this.rotation.yaw)
    };
    
    const right = {
      x: Math.cos(this.rotation.yaw),
      z: -Math.sin(this.rotation.yaw)
    };
    
    // Calculate desired velocity
    let moveX = 0;
    let moveZ = 0;
    
    if (this.moveForward) {
      moveX += forward.x;
      moveZ += forward.z;
    }
    if (this.moveBackward) {
      moveX -= forward.x;
      moveZ -= forward.z;
    }
    if (this.moveLeft) {
      moveX -= right.x;
      moveZ -= right.z;
    }
    if (this.moveRight) {
      moveX += right.x;
      moveZ += right.z;
    }
    
    // Normalize and apply speed
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX = (moveX / length) * GAME_CONSTANTS.WALK_SPEED;
      moveZ = (moveZ / length) * GAME_CONSTANTS.WALK_SPEED;
    }
    
    // Set velocity (preserve Y velocity for gravity/jumping)
    this.rigidBody.setLinvel({ x: moveX, y: currentVelocity.y, z: moveZ }, true);
    
    // Update position from physics
    const translation = this.rigidBody.translation();
    this.position = { x: translation.x, y: translation.y, z: translation.z };
    this.velocity = currentVelocity;
    
    // Check if grounded
    this.canJump = Math.abs(currentVelocity.y) < 0.1;
  }

  private jump(): void {
    if (!this.rigidBody) return;
    
    const linvel = this.rigidBody.linvel();
    this.rigidBody.setLinvel({
      x: linvel.x,
      y: Math.sqrt(2 * Math.abs(GAME_CONSTANTS.GRAVITY) * GAME_CONSTANTS.JUMP_HEIGHT),
      z: linvel.z
    }, true);
    
    this.canJump = false;
  }

  takeDamage(damage: number): boolean {
    if (!this.alive) return false;
    
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      return true; // Player died
    }
    return false;
  }

  /**
   * Respawn the player at a random spawn point and reset health
   */
  respawn(spawn: Vector3, spawnIndex: number): void {
    this.health = GAME_CONSTANTS.MAX_HEALTH;
    this.alive = true;
    this.position = { ...spawn };
    this.spawnIndex = spawnIndex;
    if (this.rigidBody) {
      this.rigidBody.setTranslation(this.position, true);
      this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  getSpawnIndex(): number {
    return this.spawnIndex;
  }

  getState(): PlayerState {
    return {
      id: this.id,
      position: this.position,
      rotation: this.rotation,
      velocity: this.velocity,
      health: this.health,
      alive: this.alive,
      username: this.username,
    };
  }

  destroy(): void {
    if (this.rigidBody) {
      this.world.removeRigidBody(this.rigidBody);
      this.rigidBody = null;
    }
  }
}

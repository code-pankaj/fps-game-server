import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from '../game/GameServer.js';
import { Matchmaker } from '../matchmaking/Matchmaker.js';
import {
  NetworkMessage,
  MessageType,
  JoinMessage,
} from '../types/game.types.js';
import { GAME_CONSTANTS, MAP_CONSTANTS } from '../constants/game.constants.js';

interface Client {
  ws: WebSocket;
  playerId: string;
  username: string;
  lastUpdate: number;
  roomId?: string;
}

/**
 * Manages WebSocket connections and message routing
 */
export class NetworkManager {
  private wss: WebSocketServer;
  private gameServer: GameServer;
  private clients: Map<WebSocket, Client> = new Map();
  private broadcastInterval: NodeJS.Timeout | null = null;
  private playerCounter = 1;
  private usedNumbers: Set<number> = new Set();
  private matchmaker: Matchmaker = new Matchmaker();

  constructor(wss: WebSocketServer, gameServer: GameServer) {
    this.wss = wss;
    this.gameServer = gameServer;
    
    this.setupWebSocketServer();
    this.startBroadcastLoop();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('🔌 New connection established');
      
      ws.on('message', (data: Buffer) => {
        try {
          const message: NetworkMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to parse message:', error);
        }
      });
      
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });
  }

  private handleMessage(ws: WebSocket, message: NetworkMessage): void {
    const { type, data } = message;
    
    switch (type) {
      case 'player_join':
        this.handlePlayerJoin(ws, data as JoinMessage);
        break;
        
      case 'player_input':
        this.handlePlayerInput(ws, data);
        break;
        
      case 'player_shoot':
        this.handlePlayerShoot(ws, data);
        break;
        
      default:
        console.warn('⚠️  Unknown message type:', type);
    }
  }

  private handlePlayerJoin(ws: WebSocket, data: JoinMessage): void {
    const playerId = this.generatePlayerId();
    const username = this.generateUsername();
    
    this.matchmaker.allocateRoom().then(room => {
      const player = room.server.addPlayer(playerId, username);
      // Register client with roomId
      this.clients.set(ws, {
        ws,
        playerId,
        username,
        lastUpdate: Date.now(),
        roomId: room.id,
      });
      // Send join confirmation scoped to room
      this.sendMessage(ws, {
        type: MessageType.PLAYER_JOINED,
        data: {
          playerId,
          gameState: room.server.getGameState(),
          roomId: room.id,
        },
        timestamp: Date.now(),
      });
      // Notify other clients (we will still broadcast globally; clients can filter by roomId)
      this.broadcastExcept(ws, {
        type: MessageType.PLAYER_JOINED,
        data: {
          player: player.getState(),
          roomId: room.id,
        },
        timestamp: Date.now(),
      });
    }).catch(err => {
      console.error('❌ Matchmaker allocation failed:', err);
    });
  }

  private handlePlayerInput(ws: WebSocket, data: any): void {
    const client = this.clients.get(ws);
    if (!client) return;
    const room = client.roomId ? this.matchmaker.getRoomById(client.roomId) : undefined;
    const player = room?.server.getPlayer(client.playerId);
    if (player && data.position && data.rotation) {
      // Update player state from client position update
      player.updateFromClient(data.position, data.rotation, data.velocity || { x: 0, y: 0, z: 0 });
      client.lastUpdate = Date.now();
    }
  }

  private handlePlayerShoot(ws: WebSocket, data: any): void {
    const client = this.clients.get(ws);
    if (!client) return;
    const room = client.roomId ? this.matchmaker.getRoomById(client.roomId) : undefined;
    if (!room) return;
    
    // Broadcast shoot event to all clients
    this.broadcast({
      type: MessageType.PLAYER_SHOT,
      data: {
        playerId: client.playerId,
        ...data,
        roomId: client.roomId,
      },
      timestamp: Date.now(),
    });

    // Server-side hit detection (best-effort): simple angle + distance check
    try {
      const shooter = room.server.getPlayer(client.playerId);
      if (!shooter) return;

      const origin = data.position; // {x,y,z}
      const dir = data.direction; // {x,y,z}
      // Normalize direction
      const dirLen = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z) || 1;
      const ndir = { x: dir.x/dirLen, y: dir.y/dirLen, z: dir.z/dirLen };

      // Iterate potential victims
      for (const [id, target] of room.server.getPlayers()) {
        if (id === client.playerId) continue; // don't hit self

        const state = target.getState();
        // Vector from origin to target center
        const toTarget = {
          x: state.position.x - origin.x,
          y: state.position.y - origin.y,
          z: state.position.z - origin.z,
        };

        const projection = ndir.x * toTarget.x + ndir.y * toTarget.y + ndir.z * toTarget.z; // t along ray
        if (projection <= 0) continue; // behind shooter

        // Maximum weapon range (cheap cap)
        const MAX_RANGE = 200;
        if (projection > MAX_RANGE) continue;

        // Closest point on ray to player center
        const closest = {
          x: origin.x + ndir.x * projection,
          y: origin.y + ndir.y * projection,
          z: origin.z + ndir.z * projection,
        };

        // Separate horizontal (XZ) and vertical (Y) distances to model full capsule
        const dx = state.position.x - closest.x;
        const dz = state.position.z - closest.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const verticalDist = Math.abs(state.position.y - closest.y);

        // Consider hit if within expanded capsule (bigger and taller)
        const HIT_MARGIN = 0.6; // meters (wider)
        const VERTICAL_MARGIN = 0.6; // meters (taller)

        const halfHeight = GAME_CONSTANTS.PLAYER_HEIGHT / 2;
        const verticalAllowed = halfHeight + VERTICAL_MARGIN;

        if (horizontalDist > (GAME_CONSTANTS.PLAYER_RADIUS + HIT_MARGIN)) continue;
        if (verticalDist > verticalAllowed) continue;

        // Determine hit height at the intersection point
        const hitY = closest.y;
        const headThreshold = state.position.y + GAME_CONSTANTS.PLAYER_HEIGHT * 0.75;
        const isHeadshot = hitY >= headThreshold;

        const damage = isHeadshot ? GAME_CONSTANTS.MAX_HEALTH : 32;

        const died = target.takeDamage(damage);

        // Broadcast hit event
        this.broadcast({
          type: MessageType.PLAYER_HIT,
          data: {
            shooterId: client.playerId,
            victimId: id,
            damage,
            hitPosition: { x: state.position.x, y: state.position.y, z: state.position.z },
            roomId: client.roomId,
          },
          timestamp: Date.now(),
        });

        if (died) {
          // Broadcast death / kill notification
          this.broadcast({
            type: MessageType.PLAYER_DIED,
            data: {
              shooterId: client.playerId,
              victimId: id,
              shooterName: client.username,
              victimName: state.username,
              roomId: client.roomId,
            },
            timestamp: Date.now(),
          });

          // Update scores and check win condition (per room)
          const result = room.server.addKill(client.username);
          this.broadcast({
            type: MessageType.SCORE_UPDATE,
            data: { scores: result.scores },
            timestamp: Date.now(),
          });
          if (result.winner) {
            this.broadcast({
              type: MessageType.MATCH_WON,
              data: { winner: result.winner, scores: result.scores },
              timestamp: Date.now(),
            });
          }

          // Schedule respawn after configured time
          setTimeout(() => {
            room.server.respawnPlayer(target);
            // After respawn, clients get updated state on broadcast loop
          }, GAME_CONSTANTS.RESPAWN_TIME);
        }
      }
    } catch (e) {
      console.error('Error during hit detection:', e);
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (client) {
      // Free up the username number
      this.freeUsername(client.username);
      
      if (client.roomId) {
        this.matchmaker.removePlayerFromRoom(client.roomId, client.playerId);
      } else {
        this.gameServer.removePlayer(client.playerId);
      }
      this.clients.delete(ws);
      
      // Notify all clients with username
      this.broadcast({
        type: MessageType.PLAYER_LEFT,
        data: {
          playerId: client.playerId,
          username: client.username,
          roomId: client.roomId,
        },
        timestamp: Date.now(),
      });
      
      console.log('🔌 Client disconnected');
    }
  }

  private startBroadcastLoop(): void {
    // Broadcast game state at fixed rate
    const broadcastRate = 1000 / GAME_CONSTANTS.TICK_RATE;
    
    this.broadcastInterval = setInterval(() => {
      const now = Date.now();
      // Send per-client their room's game state
      for (const [ws, client] of this.clients) {
        const room = client.roomId ? this.matchmaker.getRoomById(client.roomId) : undefined;
        if (!room) continue;
        const gameState = room.server.getGameState();
        this.sendMessage(ws, {
          type: MessageType.GAME_STATE,
          data: { ...gameState, roomId: client.roomId },
          timestamp: now,
        });
      }
    }, broadcastRate);
  }

  private sendMessage(ws: WebSocket, message: NetworkMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: NetworkMessage): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private broadcastExcept(excludeWs: WebSocket, message: NetworkMessage): void {
    const data = JSON.stringify(message);
    
    for (const client of this.clients.values()) {
      if (client.ws !== excludeWs && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUsername(): string {
    // Find next available player number
    while (this.usedNumbers.has(this.playerCounter)) {
      this.playerCounter++;
    }
    
    const username = `Player ${this.playerCounter}`;
    this.usedNumbers.add(this.playerCounter);
    this.playerCounter++;
    
    return username;
  }

  private freeUsername(username: string): void {
    // Extract number from "Player X" format
    const match = username.match(/^Player (\d+)$/);
    if (match) {
      const number = parseInt(match[1], 10);
      this.usedNumbers.delete(number);
    }
  }
}

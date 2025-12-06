import { GameServer } from '../game/GameServer.js';
import { getSolanaClient } from '../onchain/anchorClient.js';

interface Room {
  id: number;
  server: GameServer;
  capacity: number;
  matchPda?: string; // On-chain match PDA address
}

export class Matchmaker {
  private rooms: Room[] = [];
  private readonly CAPACITY = 2;
  private nextRoomId: number;

  constructor() {
    // Start with timestamp-based ID to avoid conflicts with existing matches
    // Use last 6 digits of timestamp for reasonable uniqueness
    this.nextRoomId = Math.floor(Date.now() / 1000) % 1000000;
  }

  async allocateRoom(): Promise<Room> {
    // Find a room with available slot
    let room = this.rooms.find(r => r.capacity > this.getPlayerCount(r));
    if (!room) {
      // Create new room with numeric ID
      const id = this.nextRoomId++;
      const server = new GameServer(id);
      await server.initialize();
      room = { id, server, capacity: this.CAPACITY };
      this.rooms.push(room);
      console.log(`🏛️ Created room ${id}`);
      
      // Create match on-chain
      try {
        const solanaClient = getSolanaClient();
        const matchPda = await solanaClient.createMatch(id, 3); // 3 kills to win
        room.matchPda = matchPda.toString();
        room.server.setMatchPda(matchPda.toString());
        console.log(`⛓️  Match ${id} created on blockchain`);
      } catch (error) {
        console.error(`❌ Failed to create on-chain match ${id}:`, error);
        // Continue anyway - game can still work without on-chain
      }
    }
    return room;
  }

  getPlayerCount(room: Room): number {
    return room.server.getPlayers().size;
  }

  removePlayerFromRoom(roomId: number, playerId: string): void {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;
    room.server.removePlayer(playerId);
    // Optionally: tear down empty rooms
    if (room.server.getPlayers().size === 0) {
      this.destroyRoom(roomId);
    }
  }

  destroyRoom(roomId: number): void {
    const idx = this.rooms.findIndex(r => r.id === roomId);
    if (idx >= 0) {
      console.log(`🧹 Destroying empty room ${roomId}`);
      // Stop server loop
      this.rooms[idx].server.stop();
      this.rooms.splice(idx, 1);
    }
  }

  getRoomById(roomId: number): Room | undefined {
    return this.rooms.find(r => r.id === roomId);
  }
}

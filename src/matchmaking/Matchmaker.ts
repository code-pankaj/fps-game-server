import { GameServer } from '../game/GameServer.js';

interface Room {
  id: number;
  server: GameServer;
  capacity: number;
}

export class Matchmaker {
  private rooms: Room[] = [];
  private readonly CAPACITY = 2;
  private nextRoomId = 1;

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
      console.log(`🏟️ Created room ${id}`);
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

import { WebSocketServer, WebSocket } from 'ws';
import { GameServer } from './game/GameServer.js';
import { NetworkManager } from './network/NetworkManager.js';
import { getSolanaClient } from './onchain/anchorClient.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  console.log('🚀 Starting FPS Game Server...');
  
  // Initialize Solana client
  try {
    getSolanaClient();
    console.log('⛓️  Solana client initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize Solana client:', error);
    console.log('⚠️  Server will run without blockchain integration');
  }
  
  // Create WebSocket server
  const wss = new WebSocketServer({ port: Number(PORT) });
  
  // Create game server instance
  const gameServer = new GameServer();
  await gameServer.initialize();
  
  // Create network manager
  const networkManager = new NetworkManager(wss, gameServer);
  
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    gameServer.stop();
    wss.close();
    process.exit(0);
  });
}

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

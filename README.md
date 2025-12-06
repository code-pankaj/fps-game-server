# FPS Game Server

Backend server for the FPS multiplayer game with blockchain integration.

## Features

- **WebSocket Server**: Real-time multiplayer communication
- **Physics Engine**: RAPIER3D for server-side physics validation
- **Matchmaking**: Room-based matchmaking (2 players per room)
- **Blockchain Integration**: Creates matches on Solana, processes signed transactions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file (see `.env.example`):

```bash
cp .env.example .env
```

**Important**: The server keypair is already generated at `server-keypair.json` with public key:
```
9CWYkYyfhhvJb62mSwpLwWVe8zsu3pg8tpnmV7jyiktw
```

### 3. Verify Server Wallet Balance

```bash
solana balance 9CWYkYyfhhvJb62mSwpLwWVe8zsu3pg8tpnmV7jyiktw --url devnet
```

If balance is low, airdrop more SOL:
```bash
solana airdrop 2 9CWYkYyfhhvJb62mSwpLwWVe8zsu3pg8tpnmV7jyiktw --url devnet
```

### 4. Run Server

Development mode:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Architecture

```
Client (Frontend) → WebSocket → Server (Backend) → Solana RPC → Smart Contract
```

### What the Server Does

1. **Creates Matches**: When a room is allocated, server creates match on-chain
2. **Manages Physics**: Server-authoritative physics simulation with RAPIER
3. **Processes Transactions**: Receives signed transactions from clients and broadcasts to Solana
4. **Coordinates State**: Syncs game state with blockchain state

## API / Message Types

### Client → Server

- `player_join`: Join game (includes wallet address)
- `player_input`: Update player position/rotation
- `player_shoot`: Fire weapon
- `record_kill_tx`: Signed blockchain transaction for kill recording

### Server → Client

- `player_joined`: Join confirmation (includes match PDA)
- `game_state`: Current game state (sent at tick rate)
- `player_shot`: Shot event broadcast
- `player_hit`: Hit detection result
- `player_died`: Kill notification
- `score_update`: Score changes
- `match_won`: Match winner
- `kill_recorded_onchain`: Blockchain confirmation

## Deployment

### Railway

1. Connect GitHub repository
2. Add environment variables:
   - `SOLANA_RPC_URL`: `https://api.devnet.solana.com`
   - `PORT`: `3001` (Railway sets this automatically)
   
3. Upload `server-keypair.json` as a secret file or set `SERVER_KEYPAIR_PATH` to Railway's secret storage

4. Railway will auto-deploy on push to main branch

### Manual Deployment

```bash
# Build
npm run build

# Start
PORT=3001 npm start
```

## Monitoring

Server logs important events:
- 🏛️ Room creation
- ⛓️ On-chain match creation
- 👥 Player joins/leaves
- 💀 Kills and hits
- ✅ Blockchain transaction confirmations

## Troubleshooting

### "Insufficient funds" error
```bash
# Airdrop more SOL to server wallet
solana airdrop 2 9CWYkYyfhhvJb62mSwpLwWVe8zsu3pg8tpnmV7jyiktw --url devnet
```

### "Cannot find module './types/fps_game.js'"
```bash
# Copy IDL from onchain project
cp ../fps-game-onchain/target/types/fps_game.ts ./src/types/
```

### WebSocket connection refused
- Check if PORT environment variable is set
- Verify firewall allows WebSocket connections
- For Railway: Check deployment logs

## Files Structure

```
src/
├── index.ts                  # Entry point
├── constants/
│   └── game.constants.ts     # Game configuration
├── game/
│   └── GameServer.ts         # Core game loop
├── matchmaking/
│   └── Matchmaker.ts         # Room allocation + on-chain match creation
├── network/
│   └── NetworkManager.ts     # WebSocket handling + transaction processing
├── onchain/
│   └── anchorClient.ts       # Solana/Anchor integration
├── player/
│   └── ServerPlayer.ts       # Server-side player entity
└── types/
    ├── game.types.ts         # Shared type definitions
    └── fps_game.ts           # Smart contract types
```

## Security Notes

- **Never commit** `server-keypair.json` or `.env` to Git
- **Use secrets management** in production (Railway Secrets, AWS Secrets Manager, etc.)
- **Monitor wallet balance** - server pays for match creation transactions
- **Rate limit** WebSocket connections to prevent abuse

## License

MIT

# SolFrag - Game Server

> **Backend server for [SolFrag](https://github.com/code-pankaj/SolFrag)** - a blockchain-based multiplayer FPS game on Solana.

This is the server-side component that handles real-time multiplayer gameplay, matchmaking, and blockchain integration.

## What It Does

The server acts as the central hub for gameplay:

- **Connects Players**: Manages real-time communication between players
- **Creates Matches**: Sets up 2-player game rooms and records them on the Solana blockchain
- **Validates Gameplay**: Ensures fair play by verifying player actions
- **Records Kills**: Processes and confirms kill transactions on the blockchain

## How It Works

```
Players → Server → Solana Blockchain
```

1. Players connect to the server via WebSocket
2. Server matches 2 players together and creates a match on Solana
3. During gameplay, server validates all actions
4. When a player scores a kill, it gets recorded on the blockchain
5. Match results are stored permanently on Solana

## Learn More

For the complete project including the game client and smart contracts, visit:
[github.com/code-pankaj/SolFrag](https://github.com/code-pankaj/SolFrag)

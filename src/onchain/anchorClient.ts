import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROGRAM_ID = new PublicKey('HTewvNaFXBYjBnEixXXGUAHwjU2yAJbAAdDfouzm3a51');

export class SolanaClient {
  private connection: Connection;
  private program: Program;
  private serverKeypair: Keypair;
  private provider: AnchorProvider;

  constructor() {
    // Use environment variable for RPC URL, fallback to devnet
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    // Load server keypair (you'll need to generate this)
    // For now, create a new one or load from environment
    this.serverKeypair = this.loadServerKeypair();

    // Create wallet from keypair
    const wallet = new Wallet(this.serverKeypair);

    // Create provider
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });

    // Load IDL and create program
    const idl = this.loadIdl();
    this.program = new Program(idl, this.provider);

    console.log('✅ Solana client initialized');
    console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`🔑 Server wallet: ${this.serverKeypair.publicKey.toString()}`);
  }

  private loadServerKeypair(): Keypair {
    // Try to load from base64 env var first (for Railway)
    if (process.env.SERVER_KEYPAIR_BASE64) {
      try {
        const keypairData = JSON.parse(Buffer.from(process.env.SERVER_KEYPAIR_BASE64, 'base64').toString('utf-8'));
        console.log('🔑 Loaded keypair from base64 environment variable');
        return Keypair.fromSecretKey(new Uint8Array(keypairData));
      } catch (error) {
        console.error('❌ Failed to parse SERVER_KEYPAIR_BASE64:', error);
      }
    }

    // Try to load from file
    try {
      const keypairPath = process.env.SERVER_KEYPAIR_PATH || './server-keypair.json';
      const keypairData = JSON.parse(readFileSync(keypairPath, 'utf-8'));
      console.log('🔑 Loaded keypair from file:', keypairPath);
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
      console.warn('⚠️  No server keypair found, generating new one');
      const newKeypair = Keypair.generate();
      console.log('🔑 New keypair public key:', newKeypair.publicKey.toString());
      console.log('💡 Save this keypair to file for production use');
      return newKeypair;
    }
  }

  private loadIdl(): any {
    try {
      const idlPath = join(process.cwd(), 'idl', 'fps_game.json');
      return JSON.parse(readFileSync(idlPath, 'utf-8'));
    } catch (error) {
      console.error('❌ Failed to load IDL:', error);
      throw new Error('IDL file not found. Copy it from fps-game-onchain/target/idl/');
    }
  }

  /**
   * Create a new match on-chain
   */
  async createMatch(matchId: number, winPoints: number = 3): Promise<PublicKey> {
    try {
      console.log(`🎮 Creating on-chain match ${matchId}...`);

      // Derive PDA for match account
      const [matchPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('match'),
          this.serverKeypair.publicKey.toBuffer(),
          Buffer.from(matchId.toString().padStart(8, '0')),
        ],
        this.program.programId
      );

      const tx = await this.program.methods
        .createMatch(matchId, winPoints)
        .accounts({
          owner: this.serverKeypair.publicKey,
          matchAccount: matchPda,
        })
        .rpc();

      console.log(`✅ Match created on-chain: ${matchPda.toString()}`);
      console.log(`� Transaction: ${tx}`);

      return matchPda;
    } catch (error) {
      console.error('❌ Failed to create match on-chain:', error);
      throw error;
    }
  }

  /**
   * Record a player joining the match
   */
  async joinMatch(matchId: number, playerPubkey: PublicKey): Promise<void> {
    try {
      const [matchPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('match'),
          this.serverKeypair.publicKey.toBuffer(),
          Buffer.from(matchId.toString().padStart(8, '0')),
        ],
        this.program.programId
      );

      // Note: This would need the player's keypair to sign
      // For now, the server acts as intermediary
      console.log(`👥 Player ${playerPubkey.toString()} joining match ${matchId}...`);

      // This is a placeholder - in a real dApp, the client should sign this
      // For now, we'll just track it server-side
      console.log('⚠️  joinMatch called but requires player signature');
    } catch (error) {
      console.error('❌ Failed to join match:', error);
    }
  }

  /**
   * Record a kill on-chain
   */
  async recordKill(
    matchId: number,
    shooterPubkey: PublicKey,
    victimPubkey: PublicKey
  ): Promise<void> {
    try {
      console.log(`💀 Recording kill: ${shooterPubkey.toString()} → ${victimPubkey.toString()}`);

      const [matchPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('match'),
          this.serverKeypair.publicKey.toBuffer(),
          Buffer.from(matchId.toString().padStart(8, '0')),
        ],
        this.program.programId
      );

      // Note: This requires the shooter's signature
      // In proper dApp architecture, client should sign and send to server
      console.log('⚠️  recordKill called but requires shooter signature');
      console.log(`📍 Match PDA: ${matchPda.toString()}`);
    } catch (error) {
      console.error('❌ Failed to record kill:', error);
    }
  }

  /**
   * Get match state from blockchain (commented out for now)
   */
  async getMatchState(matchId: number): Promise<any> {
    console.warn('getMatchState not implemented in current version');
    return null;
  }

  getServerPublicKey(): PublicKey {
    return this.serverKeypair.publicKey;
  }

  getProgram(): Program {
    return this.program;
  }
}

// Singleton instance
let solanaClient: SolanaClient | null = null;

export function getSolanaClient(): SolanaClient {
  if (!solanaClient) {
    solanaClient = new SolanaClient();
  }
  return solanaClient;
}

import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROGRAM_ID = new PublicKey('HTewvNaFXBYjBnEixXXGUAHwjU2yAJbAAdDfouzm3a51');

export class SolanaClient {
  private connection: Connection;
  private program: Program | null = null;

  constructor() {
    // Use environment variable for RPC URL, fallback to devnet
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    console.log('✅ Solana client initialized (read-only)');
    console.log(`📍 Program ID: ${PROGRAM_ID.toString()}`);
    console.log(`🌐 RPC URL: ${rpcUrl}`);
  }

  /**
   * Send a pre-signed transaction to Solana network
   */
  async sendSignedTransaction(serializedTransaction: string): Promise<string> {
    try {
      const txBuffer = Buffer.from(serializedTransaction, 'base64');
      
      const signature = await this.connection.sendRawTransaction(txBuffer, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      console.log(`📤 Transaction sent: ${signature}`);
      
      // Confirm the transaction
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      console.log(`✅ Transaction confirmed: ${signature}`);
      return signature;
    } catch (error) {
      console.error('❌ Failed to send transaction:', error);
      throw error;
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getProgramId(): PublicKey {
    return PROGRAM_ID;
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

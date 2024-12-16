import { Contract } from "near-api-js";

export type UTXO = {
  txid: string;
  vout: number;
  value: string;
  script_pubkey: string;
};

export type PreparedBitcoinTransaction = {
  tx: {
    version: number;
    locktime: number;
    input: {
      previous_output: {
        txid: string;
        vout: number;
      };
      script_sig: string;
      sequence: number;
      witness: string[];
    }[];
    output: {
      value: string;
      script_pubkey: string;
    }[];
  };
  sighashes: number[][];
};

export interface BridgeContract extends Contract {
  // Initialize contract
  new (args: {}): Promise<void>;

  // Set signer account
  set_signer_account(args: { signer_account: string }): Promise<void>;

  // Prepare BTC transaction
  prepare_btc_tx(args: {
    input_utxos: UTXO[];
    output_utxos: UTXO[];
  }): Promise<PreparedBitcoinTransaction>;

  // Swap BTC
  swap_btc(args: {
    input_utxos: UTXO[];
    output_utxos: UTXO[];
  }): Promise<string>;

  // Swap BTC callback
  swap_btc_callback(args: {
    prepared_bitcoin_transaction: PreparedBitcoinTransaction;
  }): Promise<string>;
}

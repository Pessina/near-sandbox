import { Contract } from "near-api-js";
import { ContractChangeMethodArgs } from "../types";

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
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

export type EvmTransaction = {
  nonce: number;
  to: string;
  value: string;
  max_priority_fee_per_gas: string;
  max_fee_per_gas: string;
  gas_limit: string;
  chain_id: number;
  data?: number[];
};

export type BridgeContract = Contract & {
  swap_btc: (
    args: ContractChangeMethodArgs<{
      input_utxos: UTXO[];
      output_utxos: UTXO[];
      sender_public_key: string;
    }>
  ) => Promise<string>;

  swap_evm: (
    args: ContractChangeMethodArgs<{
      tx: EvmTransaction;
    }>
  ) => Promise<string>;
};

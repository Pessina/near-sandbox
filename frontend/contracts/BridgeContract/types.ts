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

export type BridgeContract = Contract & {
  new: (args: ContractChangeMethodArgs<{}>) => Promise<void>;

  set_signer_account: (
    args: ContractChangeMethodArgs<{
      signer_account: string;
    }>
  ) => Promise<void>;

  prepare_btc_tx: (
    args: ContractChangeMethodArgs<{
      input_utxos: UTXO[];
      output_utxos: UTXO[];
    }>
  ) => Promise<PreparedBitcoinTransaction>;

  swap_btc: (
    args: ContractChangeMethodArgs<{
      input_utxos: UTXO[];
      output_utxos: UTXO[];
    }>
  ) => Promise<string>;

  swap_btc_callback: (
    args: ContractChangeMethodArgs<{
      prepared_bitcoin_transaction: PreparedBitcoinTransaction;
    }>
  ) => Promise<string>;
};

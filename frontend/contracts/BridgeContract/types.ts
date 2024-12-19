import { Contract } from "near-api-js";
import { ContractChangeMethodArgs } from "../types";

export type BtcInput = {
  txid: string;
  vout: number;
  value: number;
  script_pubkey: string;
};

export type BtcOutput = {
  value: number;
  script_pubkey: string;
};

export type BitcoinTransactionRequest = {
  inputs: BtcInput[];
  outputs: BtcOutput[];
  signer_public_key: string;
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
  sighashes: Uint8Array[];
};

export type SignResult = {
  big_r: {
    affine_point: string;
  };
  s: {
    scalar: string;
  };
  recovery_id: number;
};

export type EvmTransactionRequest = {
  nonce: number;
  to: string;
  value: string;
  max_priority_fee_per_gas: string;
  max_fee_per_gas: string;
  gas_limit: string;
  chain_id: number;
  data?: number[];
};

export type PreparedEvmTransaction = {
  omni_evm_tx: any; // TODO: Define proper type
  tx_hash: Uint8Array;
};

export type BridgeContract = Contract & {
  sign_btc: (
    args: ContractChangeMethodArgs<BitcoinTransactionRequest>
  ) => Promise<string>;

  sign_evm: (
    args: ContractChangeMethodArgs<EvmTransactionRequest>
  ) => Promise<string>;

  swap_btc_krnl: (
    args: ContractChangeMethodArgs<{
      auth: string;
      sender: string;
      recipient: string;
      kernel_response: string;
    }>
  ) => Promise<string>;
};

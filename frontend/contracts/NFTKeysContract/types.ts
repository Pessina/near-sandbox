import { Contract } from "near-api-js";
import { ContractChangeMethodArgs } from "../types";

export type StorageBalanceResult = {
  total: string;
  available: string;
};

export interface NFTMetadata {
  title: string | null;
  description: string | null;
  media: string | null;
  media_hash: string | null;
  copies: number | null;
  issued_at: string | null;
  expires_at: string | null;
  starts_at: string | null;
  updated_at: string | null;
  extra: string | null;
  reference: string | null;
  reference_hash: string | null;
}

export interface NFT {
  token_id: string;
  owner_id: string;
  metadata: NFTMetadata;
  approved_account_ids: Record<string, number>;
}

export type NFTKeysContract = Contract & {
  new: (
    args: ContractChangeMethodArgs<{
      signer_contract_id: string;
    }>
  ) => Promise<void>;

  mint: () => Promise<number>;

  nft_metadata: (args: { token_id?: string }) => Promise<NFTMetadata>;

  nft_token: (args: { token_id: string }) => Promise<NFT>;

  nft_tokens: (args: { from_index?: string; limit?: number }) => Promise<NFT[]>;

  nft_tokens_for_owner: (args: {
    account_id: string;
    from_index: string;
    limit: number;
  }) => Promise<NFT[]>;

  nft_transfer: (
    args: ContractChangeMethodArgs<{
      receiver_id: string;
      token_id: string;
      approval_id?: number;
      memo?: string;
    }>
  ) => Promise<void>;

  ckt_public_key_for: (
    args: ContractChangeMethodArgs<{
      token_id: string;
      path?: string;
    }>
  ) => Promise<string>;

  ckt_sign_hash: (
    args: ContractChangeMethodArgs<{
      token_id: string;
      path?: string;
      payload: number[];
      approval_id?: number;
    }>
  ) => Promise<string>;

  nft_approve: (
    args: ContractChangeMethodArgs<{
      token_id: string;
      account_id: string;
      msg?: string;
    }>
  ) => Promise<number>;

  nft_is_approved: (args: {
    token_id: string;
    approved_account_id: string;
    approval_id?: number;
  }) => Promise<boolean>;

  nft_revoke: (
    args: ContractChangeMethodArgs<{
      token_id: string;
      account_id: string;
    }>
  ) => Promise<void>;

  nft_revoke_all: (
    args: ContractChangeMethodArgs<{
      token_id: string;
    }>
  ) => Promise<void>;

  storage_balance_of: (args: {
    account_id: string;
  }) => Promise<StorageBalanceResult | null>;

  storage_deposit: (
    args: ContractChangeMethodArgs<{
      account_id: string;
      registration_only: boolean;
    }>
  ) => Promise<StorageBalanceResult>;

  storage_unregister: (
    args: ContractChangeMethodArgs<{
      force?: boolean;
    }>
  ) => Promise<boolean>;

  storage_withdraw: (
    args: ContractChangeMethodArgs<{
      amount?: string;
    }>
  ) => Promise<StorageBalanceResult>;
};

import { Contract } from "near-api-js";
import { ContractChangeMethodArgs } from "../types";

type StorageBalanceResult = {
  total: string;
  available: string;
};

type SaleCondition = {
  token: string;
  amount: string;
};

type Sale = {
  owner_id: string;
  approval_id: number;
  nft_contract_id: string;
  token_id: string;
  path: string;
  token: string;
  sale_conditions: SaleCondition;
};

type KrnlAuth = {
  auth: string;
  kernel_responses: string;
  kernel_param_objects: string;
};

type KrnlPayload = {
  function_params: string;
  sender: string;
  auth: KrnlAuth;
};

type KernelResponse = {
  balance: string;
  wallet: string;
};

export type NFTKeysMarketplaceContract = Contract & {
  new: (
    args: ContractChangeMethodArgs<{
      owner_id: string;
    }>
  ) => Promise<void>;

  storage_deposit: (
    args: ContractChangeMethodArgs<{
      account_id?: string;
    }>
  ) => Promise<StorageBalanceResult>;

  storage_withdraw: (
    args: ContractChangeMethodArgs<{}>
  ) => Promise<StorageBalanceResult>;

  storage_minimum_balance: () => Promise<string>;

  storage_balance_of: (args: { account_id: string }) => Promise<string>;

  get_supply_sales: () => Promise<string>;

  get_supply_by_owner_id: (args: { account_id: string }) => Promise<string>;

  get_sales_by_owner_id: (args: {
    account_id: string;
    from_index?: string;
    limit?: number;
  }) => Promise<Sale[]>;

  get_supply_by_nft_contract_id: (args: {
    nft_contract_id: string;
  }) => Promise<string>;

  get_sales_by_nft_contract_id: (args: {
    nft_contract_id: string;
    from_index?: string;
    limit?: number;
  }) => Promise<Sale[]>;

  get_sale: (args: { nft_contract_token: string }) => Promise<Sale | null>;

  remove_sale: (
    args: ContractChangeMethodArgs<{
      nft_contract_id: string;
      token_id: string;
    }>
  ) => Promise<void>;

  is_krnl_authorized: (args: { krnl_payload: KrnlPayload }) => Promise<boolean>;

  decode_kernel_responses: (args: {
    kernel_responses: string;
  }) => Promise<KernelResponse>;

  get_address: (args: {
    path: string;
    chain: string;
    signer_id: string;
  }) => Promise<string>;

  derived_public_key: (args: {
    path: string;
    signer_id: string;
  }) => Promise<string>;
};

import { Contract, Account } from "near-api-js";
import { NFTKeysMarketplaceContract } from "./types";

const createMarketplaceContract = (args: {
  account: Account;
  contractId: string;
}) => {
  return new Contract(args.account, args.contractId, {
    viewMethods: [
      "storage_minimum_balance",
      "storage_balance_of",
      "get_supply_sales",
      "get_supply_by_owner_id",
      "get_sales_by_owner_id",
      "get_supply_by_nft_contract_id",
      "get_sales_by_nft_contract_id",
      "get_sale",
    ],
    changeMethods: [
      "new",
      "storage_deposit",
      "storage_withdraw",
      "list_nft_for_sale",
      "remove_sale",
      "offer",
    ],
    useLocalViewExecution: false,
  }) as unknown as NFTKeysMarketplaceContract;
};

export { createMarketplaceContract };

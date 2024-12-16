import { Contract, Account } from "near-api-js";
import { BridgeContract } from "./types";

const createBridgeContract = (args: {
  account: Account;
  contractId: string;
}) => {
  return new Contract(args.account, args.contractId, {
    viewMethods: [],
    changeMethods: [
      "new",
      "set_signer_account",
      "prepare_btc_tx",
      "swap_btc",
      "swap_btc_callback",
    ],
    useLocalViewExecution: false,
  }) as unknown as BridgeContract;
};

export { createBridgeContract };

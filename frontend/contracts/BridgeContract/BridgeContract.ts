import { Contract, Account } from "near-api-js";
import { BridgeContract } from "./types";

const createBridgeContract = (args: {
  account: Account;
  contractId: string;
}) => {
  return new Contract(args.account, args.contractId, {
    viewMethods: [],
    changeMethods: ["swap_btc"],
    useLocalViewExecution: false,
  }) as unknown as BridgeContract;
};

export { createBridgeContract };

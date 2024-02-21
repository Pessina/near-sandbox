import { Account } from "near-api-js";

export async function sign(account: Account, payload: number[], path: string) {
  const result = await account.functionCall({
    contractId: "multichain-testnet-2.testnet",
    methodName: "sign",
    args: {
      payload: payload.map((num) => Math.max(0, num)), // Ensure all numbers are positive
      path,
    },
    gas: "100000000000000",
    attachedDeposit: "0",
  });

  if ("SuccessValue" in (result.status as any)) {
    const successValue = (result.status as any).SuccessValue;
    const decodedValue = Buffer.from(successValue, "base64").toString("utf-8");

    return decodedValue;
  }

  return undefined;
}

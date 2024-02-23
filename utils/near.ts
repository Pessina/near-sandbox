import { Account } from "near-api-js";

export async function signMPC(
  account: Account,
  payload: number[],
  path: string
) {
  const result = await account.functionCall({
    // contractId: "multichain-testnet-2.testnet",
    contractId: "signer.canhazgas.testnet",
    methodName: "sign",
    args: {
      payload: payload,
      path,
    },
    gas: "300000000000000",
    attachedDeposit: "0",
  });

  if ("SuccessValue" in (result.status as any)) {
    const successValue = (result.status as any).SuccessValue;
    const decodedValue = Buffer.from(successValue, "base64").toString("utf-8");
    const parsedJSON = JSON.parse(decodedValue) as [string, string];

    return {
      v: parsedJSON[0].slice(0, 2) === "02" ? 0 : 1,
      r: `0x${parsedJSON[0].slice(2)}`,
      s: `0x${parsedJSON[1]}`,
    };
  }

  return undefined;
}

import BN from "bn.js";
import { Account } from "near-api-js";

/**
 * Signs a payload using a Multi-Party Computation (MPC) approach on the NEAR blockchain.
 *
 * This function sends a request to a smart contract on the NEAR blockchain to sign a given payload.
 * The smart contract, identified by its contract ID, executes the "sign" method with the provided
 * payload and path. The function then processes the result, extracting and decoding the signature
 * components (r, s, v) from the successful response.
 *
 * @param {Account} account - The NEAR account initiating the function call.
 * @param {number[]} payload - The payload to be signed, represented as an array of numbers.
 * @param {string} path - The path parameter to be passed to the smart contract method.
 * @returns {Promise<{v: number, r: string, s: string} | undefined>} An object containing the signature components if successful, otherwise undefined.
 */
export async function signMPC(
  account: Account,
  payload: number[],
  path: string
): Promise<
  | {
      r: string;
      s: string;
    }
  | undefined
> {
  const result = await account.functionCall({
    contractId: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
    methodName: "sign",
    args: {
      payload: payload.slice().reverse(),
      path,
    },
    gas: new BN("300000000000000"),
    attachedDeposit: new BN("0"),
  });

  if ("SuccessValue" in (result.status as any)) {
    const successValue = (result.status as any).SuccessValue;
    const decodedValue = Buffer.from(successValue, "base64").toString("utf-8");
    const parsedJSON = JSON.parse(decodedValue) as [string, string];

    return {
      r: parsedJSON[0].slice(2),
      s: parsedJSON[1],
    };
  }

  return undefined;
}

/**
 * Calls the `public_key` method on the contract to retrieve the public key.
 *
 * This function sends a function call to the contract specified by `contractId`,
 * invoking the `public_key` method without any arguments. It then processes the
 * result, attempting to decode the returned SuccessValue as a UTF-8 string to
 * extract the public key.
 *
 * @param {Account} account - The NEAR account object used to interact with the blockchain.
 * @returns {Promise<string | undefined>} The public key as a string if the call is successful, otherwise undefined.
 */
export async function getRootPublicKey(
  account: Account,
  contractId: string
): Promise<string | undefined> {
  const result = await account.functionCall({
    contractId,
    methodName: "public_key",
    args: {},
    gas: new BN("300000000000000"),
    attachedDeposit: new BN("0"),
  });

  if ("SuccessValue" in (result.status as any)) {
    const successValue = (result.status as any).SuccessValue;
    const publicKey = Buffer.from(successValue, "base64").toString("utf-8");

    return publicKey.replace(/^"|"$/g, "");
  }

  return undefined;
}

import { beforeAll, expect, test } from "vitest";

import { Account } from "near-api-js";
import initNear from "../config/near";
import { getEvmAddress } from "../utils/kdf/kdf-signer-canhazgas-contract";
import { ethers } from "ethers";
import { signMPC } from "../utils/contract/signer";
import Ethereum from "../utils/chain/EVM";

let account: Account;

beforeAll(async () => {
  account = (await initNear()).account;
});

test.skip(
  "KDF Utilities for multiple paths and transactions",
  {
    timeout: 100000,
  },
  async () => {
    const paths = [",ethereum,near.org", ",bitcoin,", ",,near.stage", ",,"];
    const transactions = [
      {
        to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
        value: ethers.utils.parseEther("0.1"),
        gasLimit: ethers.utils.hexlify(21000),
        gasPrice: ethers.utils.parseUnits("50", "gwei"),
      },
      {
        to: "0xC5fFedAd2701BeB8F70F4a7887A63f8E95db607a",
        value: ethers.utils.parseEther("0.2"),
        gasPrice: ethers.utils.parseUnits("50", "gwei"),
      },
    ];

    const testCases = paths.flatMap((path) =>
      transactions.map((transaction) => async () => {
        const accountId = account.accountId;
        const feAddress = getEvmAddress(accountId, path);
        const hashedTransaction = ethers.utils.keccak256(
          ethers.utils.serializeTransaction(transaction)
        );

        const signature = await signMPC(
          account,
          Array.from(ethers.utils.arrayify(hashedTransaction)),
          path
        );

        if (signature) {
          const beAddress = Ethereum.recoverAddressFromSignature(
            hashedTransaction,
            signature.r,
            signature.s,
            signature.v
          );

          console.log({
            feAddress,
            beAddress,
          });
          expect(feAddress).toBe(beAddress);
        } else {
          throw new Error("Signature not found");
        }
      })
    );

    await Promise.allSettled(testCases.map((testCase) => testCase()));
  }
);

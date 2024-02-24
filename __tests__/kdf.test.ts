import { beforeAll, expect, test } from "vitest";

import { Account } from "near-api-js";
import initNear from "../config/near";
import { getPublicKeyAndEvmAddress } from "../utils/kdf/kdf-signer-canhazgas-contract";
import { ethers } from "ethers";
import { signMPC } from "../utils/contract/signer";
import Ethereum from "../utils/chain/Ethereum";

const transaction = {
  to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
  value: ethers.utils.parseEther("0.1"),
  gasLimit: ethers.utils.hexlify(21000),
  gasPrice: ethers.utils.parseUnits("50", "gwei"),
};

let account: Account;

beforeAll(async () => {
  account = (await initNear()).account;
});

test(
  "KDF Utilities",
  {
    timeout: 20000,
  },
  async () => {
    const accountId = account.accountId;
    const path = ",ethereum,near.org";
    const feAddress = getPublicKeyAndEvmAddress(accountId, path);

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

      expect(feAddress.evmAddress).toBe(beAddress);
    } else {
      throw new Error("Signature not found");
    }
  }
);

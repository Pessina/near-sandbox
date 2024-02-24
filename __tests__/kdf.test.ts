import { describe, it, expect } from "vitest";

import { Account } from "near-api-js";
import { beforeEach } from "node:test";
import initNear from "../config/near";
import { getPublicKeyAndEvmAddress } from "../utils/kdf/kdf-signer-canhazgas-contract";
import { ethers } from "ethers";
import { signMPC } from "../utils/contract/signer";
import Ethereum from "../utils/chain/Ethereum";
import { fail } from "node:assert";

const transaction = {
  to: "0x4174678c78fEaFd778c1ff319D5D326701449b25", // Example recipient address
  value: ethers.utils.parseEther("0.1"), // Sending 0.1 ETH
  gasLimit: ethers.utils.hexlify(21000), // Standard gas limit for ETH transfer
  gasPrice: ethers.utils.parseUnits("50", "gwei"), // Example gas price
};

beforeEach(async () => {});

describe("KDF Utilities", () => {
  it(
    "should derive the same Ethereum address from the same path",
    async () => {
      const { account } = await initNear("felipe-sandbox.testnet");
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
    },
    {
      timeout: 20000,
    }
  );
});

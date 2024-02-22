"use client";

import React, { useState } from "react";
import { Account } from "near-api-js";
import Loader from "@/components/Loader";
import { sign } from "@/utils/near";
import useInitNear from "@/hooks/useInitNear";
import {
  logAccountAddress,
  recoverAddressFromSignature,
  recoverSenderAddress,
} from "@/utils/etherium";
import { serializeKeyPath } from "@/utils/keys";
import { ethers } from "ethers";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();

  async function callContractFunction(account: Account) {
    setIsLoading(true);
    try {
      const transaction = {
        nonce: 0,
        gasLimit: ethers.utils.hexlify(21000),
        gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits("10", "gwei")),
        to: "0x2122f00f79f10Fd378d1e3319f533267024f9b07",
        value: ethers.utils.parseEther("0.01"),
        chainId: 11155111,
      };

      const serializedTransaction =
        ethers.utils.serializeTransaction(transaction);
      const transactionHash = ethers.utils.keccak256(serializedTransaction);
      const uint8Array = Array.from(ethers.utils.arrayify(transactionHash));

      const keyPath = serializeKeyPath("ETH", "near.org");

      console.log({
        transaction,
        transactionHash,
        uint8Array,
        keyPath,
      });

      const result = await sign(account, uint8Array, ",ethereum,,");

      if (result) {
        console.log(result);
        const path = recoverAddressFromSignature(
          transactionHash,
          result.r,
          result.s
        );

        console.log(path);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isLoading || isNearLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-4">
          <button onClick={() => callContractFunction(account)}>
            Call Sign
          </button>
          <button onClick={() => recoverSenderAddress()}>
            Log sender address
          </button>
          <button onClick={() => logAccountAddress()}>
            Log account address
          </button>
        </div>
      )}
    </div>
  );
}

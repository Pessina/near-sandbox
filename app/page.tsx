"use client";

import React, { useState } from "react";
import { Account } from "near-api-js";
import Loader from "@/components/Loader";
import { signMPC } from "@/utils/near";
import useInitNear from "@/hooks/useInitNear";
import {
  logAccountAddress,
  prepareTransactionForSignature,
  recoverAddressFromSignature,
  recoverSenderAddress,
} from "@/utils/etherium";
import { ethers } from "ethers";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();

  async function callContractFunction(account: Account) {
    setIsLoading(true);
    try {
      const transactionHash = prepareTransactionForSignature({
        nonce: 11,
        gasLimit: ethers.utils.hexlify(21000),
        gasPrice: ethers.utils.hexlify(ethers.utils.parseUnits("10", "gwei")),
        to: "0x2033f00f70f103d378d1e231ff533267024f9b07",
        value: ethers.utils.parseEther("0.04"),
        chainId: 11155111,
      });

      const result = await signMPC(
        account,
        Array.from(ethers.utils.arrayify(transactionHash)),
        ",ethereum,felipe.near,"
      );

      if (result) {
        const path = recoverAddressFromSignature(
          transactionHash,
          result.r,
          result.s,
          result.v
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

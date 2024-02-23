"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import {
  prepareTransactionForSignature,
  recoverAddressFromSignature,
} from "@/utils/etherium";
import useInitNear from "@/hooks/useInitNear";
import { signMPC } from "@/utils/near";
import Input from "@/components/Input";
import Select from "@/components/Select";

export default function Home() {
  const { register, handleSubmit, watch } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const chain = watch("chain");

  async function onSubmit(data: any) {
    setIsLoading(true);
    try {
      // Placeholder for transaction preparation based on selected chain
      let transactionHash;
      switch (data.chain) {
        case "ETH":
          transactionHash = prepareTransactionForSignature({
            nonce: 11,
            gasLimit: ethers.utils.hexlify(21000),
            gasPrice: ethers.utils.hexlify(
              ethers.utils.parseUnits(data.gasPrice, "gwei")
            ),
            to: data.to,
            value: ethers.utils.parseEther(data.value),
            chainId: 1, // Mainnet
          });
          break;
        case "BTC":
        case "BNB":
          console.log(
            "Transaction preparation for BTC and BNB is not implemented yet."
          );
          break;
        default:
          console.error("Unsupported chain selected");
      }

      if (transactionHash && account) {
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
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Select
            {...register("chain")}
            placeholder="Select chain"
            className="mb-2"
            options={[
              { value: "ETH", label: "Ethereum" },
              { value: "BTC", label: "Bitcoin" },
              { value: "BNB", label: "Binance" },
            ]}
          />
          <Input {...register("to")} placeholder="To Address" />
          <Input {...register("value")} placeholder="Value" />
          {chain === "ETH" && (
            <Input
              {...register("gasPrice")}
              placeholder="Gas Price (Gwei)"
              className="mb-2"
            />
          )}
          <button type="submit" className="btn">
            Send Transaction
          </button>
        </form>
      )}
    </div>
  );
}

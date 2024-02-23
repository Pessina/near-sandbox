"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { signMPC } from "@/utils/near";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Ethereum, { SEPOLIA_CHAIN_ID } from "@/utils/Ethereum";
interface FormValues {
  chain: string;
  gasPrice: string;
  to: string;
  value: string;
}

export default function Home() {
  const { register, handleSubmit, watch } = useForm<FormValues>();
  const [isLoading, setIsLoading] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const chain = watch("chain");

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    try {
      let transactionHash;
      switch (data.chain) {
        case "ETH":
          transactionHash = Ethereum.prepareTransactionForSignature({
            nonce: 11,
            gasLimit: ethers.utils.hexlify(21000),
            gasPrice: ethers.utils.hexlify(
              ethers.utils.parseUnits("0.03", "gwei")
            ),
            to: "0x4374678c78fEaFd778c10f319e5D226702449b25",
            value: ethers.utils.parseEther("0.11"),
            chainId: SEPOLIA_CHAIN_ID,
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
          ",ethereum,near.org,"
        );

        if (result) {
          const path = Ethereum.recoverAddressFromSignature(
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

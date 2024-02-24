"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { getRootPublicKey, signMPC } from "@/utils/contract/signer";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Ethereum, { SEPOLIA_CHAIN_ID } from "@/utils/chain/Ethereum";
import Button from "@/components/Button";
import { deriveEpsilon, deriveKey } from "@/utils/kdf/kdf";
import { getPublicKeyAndEvmAddress } from "@/utils/kdf/kdf-fake-contract";

// import { generateEthereumAddress } from "@/utils/kdf";
interface FormValues {
  chain: string;
  gasPrice: string;
  to: string;
  value: string;
}

const KEY_PATH = ",ethereum,near.org";

export default function Home() {
  const { register, handleSubmit } = useForm<FormValues>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [isFetchingPublicKey, setIsFetchingPublicKey] = useState(false);
  const [rootPublicKey, setRootPublicKey] = useState<string | undefined>(
    undefined
  );
  const { account, isLoading: isNearLoading } = useInitNear();

  const ethereum = new Ethereum({
    providerUrl: process.env.NEXT_PUBLIC_INFURA_URL,
    chainId: SEPOLIA_CHAIN_ID,
  });

  async function onSubmit(data: FormValues) {
    setIsSendingTransaction(true);
    try {
      let transactionHash;
      switch (data.chain) {
        case "ETH":
          transactionHash = Ethereum.prepareTransactionForSignature(
            await ethereum.attachGasAndNonce({
              to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
              value: ethers.utils.parseEther("0.021"),
            })
          );
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
          KEY_PATH
        );

        if (result) {
          const path = Ethereum.recoverAddressFromSignature(
            transactionHash,
            result.r,
            result.s,
            result.v
          );

          console.log(`BE Address: ${path}`);
        }
      }
    } finally {
      setIsSendingTransaction(false);
    }
  }

  const fetchPublicKey = async () => {
    if (!account) return;
    setIsFetchingPublicKey(true);
    try {
      const publicKey = await getRootPublicKey(account);
      console.log({ publicKey });
      setRootPublicKey(publicKey);
    } catch (error) {
      console.error("Error fetching root public key:", error);
    } finally {
      setIsFetchingPublicKey(false);
    }
  };

  const getDerivedKey = async () => {
    if (!account) return;

    const data = {
      publicKey:
        "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u",
      accountId: account?.accountId,
      path: KEY_PATH,
    };

    // const epsilon = deriveEpsilon(data.accountId, data.path);
    // const address = deriveKey(data.publicKey, epsilon);
    const address = getPublicKeyAndEvmAddress(data.accountId, data.path);

    console.log(`FE Address: ${address.evmAddress}`);
  };

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isNearLoading ? (
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
          <Button type="submit" isLoading={isSendingTransaction}>
            Send Transaction
          </Button>
          <Button
            type="button"
            onClick={fetchPublicKey}
            isLoading={isFetchingPublicKey}
          >
            Fetch Public Key
          </Button>
          <Button type="button" onClick={getDerivedKey}>
            Get Derived Key
          </Button>
        </form>
      )}
    </div>
  );
}

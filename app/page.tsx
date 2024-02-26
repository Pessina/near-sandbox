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

interface FormValues {
  chain: string;
  gasPrice: string;
  to: string;
  value: string;
}

const KEY_PATH = ",bitcoin,felipe.org";

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
    if (!account?.accountId) {
      throw new Error("Account not found");
    }

    setIsSendingTransaction(true);
    try {
      switch (data.chain) {
        case "ETH":
          const transaction = await ethereum.attachGasAndNonce({
            from: Ethereum.deriveCanhazgasMPCAddress(
              account?.accountId,
              KEY_PATH
            ),
            to: data.to,
            value: ethers.utils.hexlify(ethers.utils.parseEther(data.value)),
          });

          const transactionHash =
            Ethereum.prepareTransactionForSignature(transaction);

          const signature = await signMPC(
            account,
            Array.from(ethers.utils.arrayify(transactionHash)),
            KEY_PATH
          );

          if (signature) {
            const serializedTransaction = ethers.utils.serializeTransaction(
              transaction,
              ethers.utils.joinSignature(signature)
            );

            const txHash = await ethereum.sendSignedTransaction(
              serializedTransaction
            );

            const address = Ethereum.recoverAddressFromSignature(
              transactionHash,
              signature.r,
              signature.s,
              signature.v
            );

            console.log(`BE Address: ${address}`);

            console.log(
              `Transaction ${JSON.stringify(transaction)} sent! Hash: ${txHash}`
            );
          }
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
    } catch (e) {
      console.error(e);
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

    // Felipe MPC real contract
    const address = Ethereum.deriveProductionAddress(
      data.accountId,
      data.path,
      data.publicKey
    );

    // Felipe MPC fake contract
    // const address = Ethereum.deriveCanhazgasMPCAddress(
    //   data.accountId,
    //   data.path
    // );

    // Osman MPC real contract
    // const address = await generateEthereumAddress({
    //   publicKey: `secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u`,
    //   accountId: `felipe-sandbox.testnet`,
    //   path: `,ethereum,near.org`,
    // });

    console.log(`FE Address: ${address}`);
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

"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { signMPC } from "@/utils/contract/signer";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Ethereum from "@/utils/chain/Ethereum";
import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import Link from "@/components/Link";

interface FormValues {
  to: string;
  value: string;
}

export default function Home() {
  const { register, handleSubmit } = useForm<FormValues>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivePath, setDerivePath] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [chain, setChain] = useState<string>("ETH");

  const ethereum = useMemo(
    () =>
      new Ethereum({
        providerUrl: process.env.NEXT_PUBLIC_INFURA_URL,
      }),
    []
  );

  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (!account?.accountId || !derivePath) {
        throw new Error("Account not found");
      }

      setIsSendingTransaction(true);
      try {
        switch (chain) {
          case "ETH":
            const transaction = await ethereum.attachGasAndNonce({
              from: Ethereum.deriveCanhazgasMPCAddress(
                account?.accountId,
                derivePath
              ),
              to: data.to,
              value: ethers.utils.hexlify(ethers.utils.parseEther(data.value)),
            });

            const transactionHash =
              Ethereum.prepareTransactionForSignature(transaction);

            const signature = await signMPC(
              account,
              Array.from(ethers.utils.arrayify(transactionHash)),
              derivePath
            );

            if (signature) {
              const transactionResponse = await ethereum.sendSignedTransaction(
                transaction,
                ethers.utils.joinSignature(signature)
              );

              const address = Ethereum.recoverAddressFromSignature(
                transactionHash,
                signature.r,
                signature.s,
                signature.v
              );

              console.log(`BE Address: ${address}`);

              toast.success(
                <span>
                  View on Sepolia:{" "}
                  <Link
                    href={`https://sepolia.etherscan.io/tx/${transactionResponse.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Transaction Details
                  </Link>
                </span>
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
    },
    [account, chain, derivePath, ethereum]
  );

  const derivedAddress = useMemo(() => {
    if (!account || !derivePath) return;

    switch (chain) {
      case "ETH":
        const data = {
          publicKey:
            "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u",
          accountId: account?.accountId,
          path: derivePath,
        };

        // Felipe MPC real contract
        // const address = Ethereum.deriveProductionAddress(
        //   data.accountId,
        //   data.path,
        //   data.publicKey
        // );

        // Felipe MPC fake contract
        const address = Ethereum.deriveCanhazgasMPCAddress(
          data.accountId,
          data.path
        );

        // Osman MPC real contract
        // const osmanAddress =  generateEthereumAddress({
        //   publicKey: data.publicKey,
        //   accountId: data.accountId,
        //   path: data.path,
        // });

        return address;
      case "BTC":
        return "BTC Address Derivation Not Implemented";
      case "BNB":
        return "BNB Address Derivation Not Implemented";
    }
  }, [account, chain, derivePath]);

  const getAccountBalance = async () => {
    if (!derivedAddress) {
      return;
    }

    let balance = "";
    switch (chain) {
      case "ETH":
        balance =
          (await ethereum.getBalance(derivedAddress)).slice(0, 8) + " ETH";
        break;
      case "BTC":
      case "BNB":
        break;
    }

    setAccountBalance(balance);
  };

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isNearLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-4">
          <Select
            label="Chain"
            placeholder="Select chain"
            className="mb-2"
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            options={[
              { value: "ETH", label: "ETH" },
              { value: "BTC", label: "BTC" },
              { value: "BNB", label: "BNB" },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Path"
              name="derivedPath"
              value={derivePath}
              onChange={(e) => setDerivePath(e.target.value)}
            />
            <Input
              label="Derived Address"
              name="derivedAddress"
              value={derivedAddress}
              disabled
              icon={{
                icon: <LuCopy />,
                onClick: () => {
                  navigator.clipboard.writeText(derivedAddress ?? "");
                  toast.success("Text copied!");
                },
              }}
            />
            <Button onClick={getAccountBalance} className="h-[38px] self-end">
              Check Balance
            </Button>
            <Input
              label="Balance"
              name="balance"
              value={accountBalance}
              disabled
            />
          </div>
          <h2 className="text-white text-2xl font-bold">Transaction</h2>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <Input
              label="Address"
              {...register("to")}
              placeholder="To Address"
            />
            <Input label="Value" {...register("value")} placeholder="Value" />
            <Button type="submit" isLoading={isSendingTransaction}>
              Send Transaction
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

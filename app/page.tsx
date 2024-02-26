"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { getRootPublicKey, signMPC } from "@/utils/contract/signer";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Ethereum, { SEPOLIA_CHAIN_ID } from "@/utils/chain/Ethereum";
import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";

interface FormValues {
  chain: string;
  to: string;
  value: string;
}

export default function Home() {
  const { register, handleSubmit } = useForm<FormValues>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [isFetchingPublicKey, setIsFetchingPublicKey] = useState(false);
  const [rootPublicKey, setRootPublicKey] = useState<string | undefined>(
    undefined
  );
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivePath, setDerivePath] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<string>("");

  const ethereum = useMemo(
    () =>
      new Ethereum({
        providerUrl: process.env.NEXT_PUBLIC_INFURA_URL,
        chainId: SEPOLIA_CHAIN_ID,
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
        switch (data.chain) {
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

              console.log(
                `Transaction ${JSON.stringify(transaction)} sent! Hash: ${
                  transactionResponse.hash
                }`
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
    [account, derivePath, ethereum]
  );

  const fetchPublicKey = useCallback(async () => {
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
  }, [account]);

  const derivedAddress = useMemo(() => {
    if (!account || !derivePath) return;

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
  }, [account, derivePath]);

  const getAccountBalance = async () => {
    if (!derivedAddress) {
      return;
    }

    setAccountBalance(await ethereum.getBalance(derivedAddress));
  };

  return (
    <div className="h-screen w-full flex justify-center items-center">
      {!account || isNearLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-4">
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
            <Button onClick={getAccountBalance}>Check Balance</Button>
            <Input
              label="Balance"
              name="balance"
              value={accountBalance}
              disabled
            />
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
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
            <Input
              label="Address"
              {...register("to")}
              placeholder="To Address"
            />
            <Input label="Value" {...register("value")} placeholder="Value" />
            <Button type="submit" isLoading={isSendingTransaction}>
              Send Transaction
            </Button>
            <Button
              type="button"
              onClick={fetchPublicKey}
              isLoading={isFetchingPublicKey}
              variant="primary"
            >
              Fetch Public Key
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

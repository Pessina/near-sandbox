"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import { ethers } from "ethers";
import useInitNear from "@/hooks/useInitNear";
import { signMPC } from "@/utils/contract/signer";
import Input from "@/components/Input";
import Select from "@/components/Select";
import EVM from "@/utils/chain/EVM";
import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";

const MPC_PUBLIC_KEY =
  "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";

export default function Home() {
  const { register, handleSubmit } = useForm<Transaction>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivedPath, setDerivedPath] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [chain, setChain] = useState<string>("ETH");

  const ethereum = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_INFURA_URL) {
      throw new Error("Invalid ETH config");
    }

    return new EVM({
      providerUrl: process.env.NEXT_PUBLIC_INFURA_URL,
      scanUrl: "https://sepolia.etherscan.io",
      name: "ETH",
    });
  }, []);

  const bsc = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_BSC_RPC_ENDPOINT) {
      throw new Error("Invalid BSC config");
    }

    return new EVM({
      providerUrl: process.env.NEXT_PUBLIC_BSC_RPC_ENDPOINT,
      scanUrl: "https://testnet.bscscan.com",
      name: "BNB",
    });
  }, []);

  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath) {
        throw new Error("Account not found");
      }

      setIsSendingTransaction(true);
      try {
        switch (chain) {
          case "BNB":
            bsc.handleTransaction(
              data,
              account,
              derivedPath,
              MPC_PUBLIC_KEY,
              "canhazgas"
            );
            break;
          case "ETH":
            ethereum.handleTransaction(
              data,
              account,
              derivedPath,
              MPC_PUBLIC_KEY,
              "canhazgas"
            );
            break;
          case "BTC":
            console.log(
              "Transaction preparation for BTC is not implemented yet."
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
    [account, bsc, chain, derivedPath, ethereum]
  );

  const derivedAddress = useMemo(() => {
    if (!account) return "Invalid account";

    let address = "";
    switch (chain) {
      case "ETH":
        const publicKey =
          "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";
        // Felipe MPC real contract
        // address = EVM.deriveProductionAddress(
        //   data.accountId,
        //   data.path,
        //   data.publicKey
        // );

        // Felipe MPC fake contract
        address = EVM.deriveCanhazgasMPCAddress(account.accountId, derivedPath);

        // Osman MPC real contract
        //  osmanAddress =  generateEthereumAddress({
        //   publicKey: data.publicKey,
        //   accountId: data.accountId,
        //   path: data.path,
        // });

        break;
      case "BTC":
        return "BTC Address Derivation Not Implemented";
      case "BNB":
        address = EVM.deriveCanhazgasMPCAddress(account.accountId, derivedPath);
        break;
    }

    return address;
  }, [account, chain, derivedPath]);

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    switch (chain) {
      case "ETH":
        balance =
          (await ethereum.getBalance(derivedAddress)).slice(0, 8) + " ETH";
        break;
      case "BTC":
        break;
      case "BNB":
        balance = (await bsc.getBalance(derivedAddress)).slice(0, 8) + " tBNB";
        break;
    }

    setAccountBalance(balance);
  }, [bsc, chain, derivedAddress, ethereum]);

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
              value={derivedPath}
              onChange={(e) => setDerivedPath(e.target.value)}
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

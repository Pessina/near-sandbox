"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import useInitNear from "@/hooks/useInitNear";
import Input from "@/components/Input";
import Select from "@/components/Select";
import EVM from "@/utils/chain/EVM";
import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import { Bitcoin } from "@/utils/chain/Bitcoin";

const MPC_PUBLIC_KEY =
  "secp256k1:37aFybhUHCxRdDkuCcB3yHzxqK7N8EQ745MujyAQohXSsYymVeHzhLxKvZ2qYeRHf3pGFiAsxqFJZjpF9gP2JV5u";

const chainsConfig = {
  ethereum: {
    providerUrl:
      "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    scanUrl: "https://sepolia.etherscan.io",
    name: "ETH",
  },
  bsc: {
    providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    scanUrl: "https://testnet.bscscan.com",
    name: "BNB",
  },
};

export default function Home() {
  const { register, handleSubmit } = useForm<Transaction>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivedPath, setDerivedPath] = useState<string>("");
  const [accountBalance, setAccountBalance] = useState<string>("");
  const [chain, setChain] = useState<string>("ETH");

  const ethereum = useMemo(() => {
    return new EVM(chainsConfig.ethereum);
  }, []);

  const bsc = useMemo(() => {
    return new EVM(chainsConfig.bsc);
  }, []);

  const bitcoin = useMemo(
    () =>
      new Bitcoin({
        networkType: "testnet",
        // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
        explorerUrl: "https://blockstream.info/testnet/api/",
      }),
    []
  );

  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath) {
        throw new Error("Account not found");
      }

      setIsSendingTransaction(true);
      try {
        switch (chain) {
          case "BNB":
            await bsc.handleTransaction(
              data,
              account,
              derivedPath,
              MPC_PUBLIC_KEY,
              "canhazgas"
            );
            break;
          case "ETH":
            await ethereum.handleTransaction(
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
        return "BTC Not Implemented";
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
        balance = (await bitcoin.fetchFeeRate()).toString();
        break;
      case "BNB":
        balance = (await bsc.getBalance(derivedAddress)).slice(0, 8) + " tBNB";
        break;
    }

    setAccountBalance(balance);
  }, [bitcoin, bsc, chain, derivedAddress, ethereum]);

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
            onChange={(e) => {
              setAccountBalance("");
              setChain(e.target.value);
            }}
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

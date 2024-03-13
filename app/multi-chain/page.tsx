"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getRootPublicKey } from "@/utils/contract/signer";

const MPC_PUBLIC_KEY =
  "secp256k1:4HFcTSodRLVCGNVcGc4Mf2fwBBBxv9jxkGdiW2S2CA1y6UpVVRWKj6RX7d7TDt65k2Bj3w9FU4BGtt43ZvuhCnNt";

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
  btc: {
    name: "BTC",
    networkType: "testnet" as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    rpcEndpoint: "https://blockstream.info/testnet/api/",
    scanUrl: "https://blockstream.info/testnet",
  },
};

enum Chain {
  ETH = "ETH",
  BNB = "BNB",
  BTC = "BTC",
}

export default function Home() {
  const { register, handleSubmit } = useForm<Transaction>();
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const { account, isLoading: isNearLoading } = useInitNear();
  const [derivedPath, setDerivedPath] = useState("");
  const [derivedAddress, setDerivedAddress] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);

  const ethereum = useMemo(() => new EVM(chainsConfig.ethereum), []);

  const bsc = useMemo(() => new EVM(chainsConfig.bsc), []);

  const bitcoin = useMemo(() => new Bitcoin(chainsConfig.btc), []);

  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath) {
        throw new Error("Account not found");
      }

      setIsSendingTransaction(true);
      try {
        switch (chain) {
          case Chain.BNB:
            await bsc.handleTransaction(
              data,
              account,
              derivedPath,
              MPC_PUBLIC_KEY
            );
            break;
          case Chain.ETH:
            await ethereum.handleTransaction(
              data,
              account,
              derivedPath,
              MPC_PUBLIC_KEY
            );
            break;
          case Chain.BTC:
            await bitcoin.handleTransaction(
              {
                to: data.to,
                value: parseFloat(data.value),
              },
              account,
              derivedPath,
              MPC_PUBLIC_KEY
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
    [account, bsc, chain, derivedPath, ethereum, bitcoin]
  );

  useEffect(() => {
    const getAddress = async () => {
      if (!account) {
        setDerivedAddress("");
        return;
      }

      // const publicKey = await getRootPublicKey(account, Contracts.PRODUCTION);

      // if (!publicKey) {
      //   setDerivedAddress("");
      //   return;
      // }

      let address = "";
      switch (chain) {
        case "ETH":
          address = EVM.deriveProductionAddress(
            account.accountId,
            derivedPath,
            MPC_PUBLIC_KEY
          );
          break;
        case "BTC":
          const Btc = new Bitcoin(chainsConfig.btc)
          address = Btc.deriveProductionAddress(
            account.accountId,
            derivedPath,
            MPC_PUBLIC_KEY
          ).address;
          break;
        case "BNB":
          address = EVM.deriveProductionAddress(
            account.accountId,
            derivedPath,
            MPC_PUBLIC_KEY
          );
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [account, chain, derivedPath]);

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    switch (chain) {
      case "ETH":
        balance =
          (await ethereum.getBalance(derivedAddress)).slice(0, 8) + " ETH";
        break;
      case "BTC":
        balance =
          (await bitcoin.fetchBalance(derivedAddress)).slice(0, 8) + " BTC";
        break;
      case "BNB":
        balance = (await bsc.getBalance(derivedAddress)).slice(0, 8) + " BNB";
        break;
    }

    setAccountBalance(balance);
  }, [bsc, chain, derivedAddress, ethereum, bitcoin]);

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
              setChain(e.target.value as Chain);
            }}
            options={[
              { value: Chain.ETH, label: "ETH" },
              { value: Chain.BTC, label: "BTC" },
              { value: Chain.BNB, label: "BNB" },
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

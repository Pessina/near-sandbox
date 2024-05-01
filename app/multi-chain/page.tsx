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
import {
  fetchDerivedBTCAddressAndPublicKey,
  fetchDerivedEVMAddress,
  signAndSendBTCTransaction,
  signAndSendEVMTransaction,
} from "multichain-tools";
import * as bitcoinlib from "bitcoinjs-lib";

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
  const { account, isLoading: isNearLoading, connection } = useInitNear();
  const [derivedPath, setDerivedPath] = useState("");
  const [derivedAddress, setDerivedAddress] = useState("");
  const [accountBalance, setAccountBalance] = useState("");
  const [chain, setChain] = useState<Chain>(Chain.ETH);
  const [mpcPublicKey, setMpcPublicKey] = useState("");

  useEffect(() => {
    const getMpcPublicKey = async () => {
      if (!account) {
        return;
      }

      const mpcPublicKey = await getRootPublicKey(
        account,
        process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
      );

      if (!mpcPublicKey) {
        throw new Error("MPC Public Key not found");
      }

      setMpcPublicKey(mpcPublicKey);
    };

    getMpcPublicKey();
  }, [account]);

  const ethereum = useMemo(() => new EVM(chainsConfig.ethereum), []);

  const bsc = useMemo(() => new EVM(chainsConfig.bsc), []);

  const bitcoin = useMemo(() => new Bitcoin(chainsConfig.btc), []);

  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath || !mpcPublicKey || !connection) {
        throw new Error(
          "Required account information is missing. Please ensure that the account ID, derived path, MPC public key, and connection are available."
        );
      }

      setIsSendingTransaction(true);

      try {
        switch (chain) {
          case Chain.BNB:
          case Chain.ETH:
            await signAndSendEVMTransaction({
              transaction: {
                to: "0x4174678c78fEaFd778c1ff319D5D326701449b25",
                value: "10000000000000000",
                derivedPath,
              },
              chainConfig: {
                providerUrl:
                  "https://sepolia.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              },
              nearAuthentication: {
                networkId: "testnet",
                keypair: await connection.config.keyStore.getKey(
                  "testnet",
                  process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID
                ),
                accountId: account.accountId,
              },
            });
            break;
          case Chain.BTC:
            await signAndSendBTCTransaction({
              chainConfig: {
                providerUrl: "https://blockstream.info/testnet/api/",
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
                networkType: "testnet",
              },
              transaction: {
                to: data.to,
                value: "300000",
                derivedPath,
              },
              nearAuthentication: {
                networkId: "testnet",
                keypair: await connection.config.keyStore.getKey(
                  "testnet",
                  process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID
                ),
                accountId: account.accountId,
              },
            });
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
    [account, chain, connection?.config.keyPair, derivedPath]
  );

  useEffect(() => {
    const getAddress = async () => {
      if (!account || !mpcPublicKey) {
        setDerivedAddress("");
        return;
      }

      let address = "";
      switch (chain) {
        case "ETH":
          address = await fetchDerivedEVMAddress(
            account.accountId,
            derivedPath,
            "testnet",
            process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
          );
          break;
        case "BTC":
          address = (
            await fetchDerivedBTCAddressAndPublicKey(
              account.accountId,
              derivedPath,
              bitcoinlib.networks.testnet,
              "testnet",
              process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
            )
          ).address;
          break;
        case "BNB":
          address = await fetchDerivedEVMAddress(
            account.accountId,
            derivedPath,
            "testnet",
            process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
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
      {!account || isNearLoading || !mpcPublicKey ? (
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
            <Input label="Data" {...register("data")} placeholder="0x" />
            <Button type="submit" isLoading={isSendingTransaction}>
              Send Transaction
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

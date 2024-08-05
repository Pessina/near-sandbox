"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Loader from "@/components/Loader";
import useInitNear from "@/hooks/useInitNear";
import Input from "@/components/Input";
import Select from "@/components/Select";

import Button from "@/components/Button";
import { LuCopy } from "react-icons/lu";
import { toast } from "react-toastify";
import {
  fetchBTCFeeProperties,
  fetchDerivedBTCAddressAndPublicKey,
  fetchDerivedEVMAddress,
  fetchEVMFeeProperties,
  signAndSendBTCTransaction,
  signAndSendEVMTransaction,
} from "multichain-tools";
import * as bitcoinlib from "bitcoinjs-lib";
import { ethers } from "ethers";
import { getBalance } from "@/utils/balance";
import { getRootPublicKey } from "@/utils/contracts";
import { NearAuthentication } from "multichain-tools/src/chains/types";
import * as bitcoin from 'bitcoinjs-lib'

const chainsConfig = {
  ethereum: {
    providerUrl:
      "https://mainnet.infura.io/v3/6df51ccaa17f4e078325b5050da5a2dd",
    scanUrl: "https://etherscan.io",
    name: "ETH",
  },
  bsc: {
    providerUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    scanUrl: "https://testnet.bscscan.com",
    name: "BNB",
  },
  btc: {
    name: "BTC",
    networkType: "mainnet" as const,
    // API ref: https://github.com/Blockstream/esplora/blob/master/API.md
    rpcEndpoint: "https://blockstream.info/api/",
    scanUrl: "https://blockstream.info",
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


  const onSubmit = useCallback(
    async (data: Transaction) => {
      if (!account?.accountId || !derivedPath || !mpcPublicKey || !connection) {
        throw new Error(
          "Required account information is missing. Please ensure that the account ID, derived path, MPC public key, and connection are available."
        );
      }

      setIsSendingTransaction(true);

      try {
        const nearAuthentication: NearAuthentication = {
          networkId: "mainnet",
          keypair: await connection.config.keyStore.getKey(
            "mainnet",
            process.env.NEXT_PUBLIC_NEAR_ACCOUNT_ID!
          ),
          accountId: account.accountId,
        };

        switch (chain) {
          case Chain.BNB:
          case Chain.ETH:
            await signAndSendEVMTransaction({
              transaction: {
                to: data.to,
                value: ethers.parseEther(data.value).toString(),
                derivedPath,
              },
              chainConfig: {
                providerUrl: chain === Chain.ETH ? chainsConfig.ethereum.providerUrl : chainsConfig.bsc.providerUrl,
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
              },
              nearAuthentication,
            });
            break;
          case Chain.BTC:
            const btcProperties = await fetchBTCFeeProperties(
              chainsConfig.btc.rpcEndpoint,
              derivedAddress,
              [
                { address: data.to, value: Math.floor(parseFloat(data.value) * 1e8) },
                {
                  script: bitcoin.script.compile([
                    bitcoin.opcodes.OP_RETURN,
                    Buffer.from('You started a revolution.\nThank you.\nWith love,\nNEAR', 'utf8')
                  ]),
                  value: 0
                }
            ]
            );

            console.log({btcProperties})

            await signAndSendBTCTransaction({
              chainConfig: {
                providerUrl: chainsConfig.btc.rpcEndpoint,
                contract: process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!,
                networkType: "bitcoin",
              },
              transaction: {
                derivedPath,
                inputs: btcProperties.inputs,
                outputs: btcProperties.outputs,
              },
              nearAuthentication,
            });
            break;
          default:
            throw new Error("Unsupported chain selected");
        }
      } catch (e) {
        console.error("Transaction failed:", e);
        // You might want to show an error message to the user here
      } finally {
        setIsSendingTransaction(false);
      }
    },
    [account?.accountId, chain, connection, derivedAddress, derivedPath, mpcPublicKey]
  );

  useEffect(() => {
    const getAddress = async () => {
      if (!account || !mpcPublicKey) {
        setDerivedAddress("");
        return;
      }

      let address = "";
      switch (chain) {
        case "BNB":
        case "ETH":
          address = await fetchDerivedEVMAddress(
            account.accountId,
            derivedPath,
            "mainnet",
            process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
          );
          break;
        case "BTC":
          address = (
            await fetchDerivedBTCAddressAndPublicKey(
              account.accountId,
              derivedPath,
              bitcoinlib.networks.bitcoin,
              "mainnet",
              process.env.NEXT_PUBLIC_CHAIN_SIGNATURE_CONTRACT!
            )
          ).address;
          break;
      }

      setDerivedAddress(address);
    };

    getAddress();
  }, [account, chain, derivedPath, mpcPublicKey]);

  const getAccountBalance = useCallback(async () => {
    let balance = "";
    try {
      switch (chain) {
        case "ETH":
          balance = await getBalance("ETH", chainsConfig.ethereum.providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} ETH`;
          break;
        case "BTC":
          balance = await getBalance("BTC", chainsConfig.btc.rpcEndpoint, derivedAddress);
          balance = `${balance} BTC`;
          break;
        case "BNB":
          balance = await getBalance("BNB", chainsConfig.bsc.providerUrl, derivedAddress);
          balance = `${parseFloat(balance).toFixed(8)} BNB`;
          break;
        default:
          throw new Error('Unsupported chain');
      }
      setAccountBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setAccountBalance('Error');
    }
  }, [chain, derivedAddress]);

  const getFeeRate = useCallback(async () => {
    let feeRate: any;
    switch (chain) {
      case "BNB":
      case "ETH":
        feeRate = await fetchEVMFeeProperties(
          chainsConfig.ethereum.providerUrl,
          {
            to: "0x0987654321098765432109876543210987654321",
            value: ethers.parseEther("1"),
          }
        );
        break;
      case "BTC":
        feeRate = await fetchBTCFeeProperties(
          chainsConfig.btc.rpcEndpoint,
          "tb1qz9f5pqk3t0lhrsuppyzrctdtrtlcewjhy0jngu",
          [{ address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2", value: 10000 }]
        );
        break;
    }

    console.log({ feeRate });
  }, [chain]);

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
            <Button onClick={getFeeRate} className="h-[38px] self-end">
              Check fee rate
            </Button>
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
